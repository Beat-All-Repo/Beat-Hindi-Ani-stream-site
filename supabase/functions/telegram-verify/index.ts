const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-secret',
};

// ═══════════════════════════════════════════════════════════════════════════
//  TELEGRAM VERIFY — SUPABASE EDGE FUNCTION
//
//  All verification is handled by your Render bot API (Flask + MongoDB).
//  This function is a pure proxy — no Supabase DB reads/writes for codes.
//
//  Required Supabase secrets:
//    BOT_API_URL    = https://your-bot.onrender.com
//    BOT_API_SECRET = same value as API_SECRET in your bot's config.py
//
//  Endpoints (all proxied to bot):
//    GET|POST ?action=status   — global stats from bot MongoDB
//    POST     ?action=verify   — verify code + register device (max 2)
//    POST     ?action=check    — check code validity (no side effects)
//    POST     ?action=revoke   — admin: revoke a code
//    GET      ?action=channels — list active channels (from Supabase, admin-managed)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_API_URL    = Deno.env.get('BOT_API_URL') || '';
  const BOT_API_SECRET = Deno.env.get('BOT_API_SECRET') || '';

  // Supabase client — only used for the `channels` action (admin-managed table)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const url    = new URL(req.url);
  const action = url.searchParams.get('action');

  let bodyData: any = null;

  const getBody = async () => {
    if (bodyData !== null) return bodyData;
    try { bodyData = await req.json(); } catch { bodyData = {}; }
    return bodyData;
  };

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Helper: call bot API
  const callBot = async (botAction: string, body?: object) => {
    if (!BOT_API_URL) throw new Error('BOT_API_URL not configured in Supabase secrets');

    const res = await fetch(
      `${BOT_API_URL}/telegram-verify?action=${botAction}`,
      body
        ? {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Secret': BOT_API_SECRET },
            body:    JSON.stringify(body),
          }
        : {
            method:  'GET',
            headers: { 'X-API-Secret': BOT_API_SECRET },
          }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bot API error ${res.status}: ${text}`);
    }

    return res.json();
  };

  try {
    // ── API info ────────────────────────────────────────────────────────────
    if (!action) {
      return json({
        service: 'Telegram Verification Bot API',
        source:  'Render bot (Flask + MongoDB)',
        endpoints: {
          'GET|POST ?action=status':   'Global stats from bot MongoDB',
          'POST     ?action=verify':   'Verify code + register device (max 2)',
          'POST     ?action=check':    'Check code (no device registration)',
          'POST     ?action=revoke':   'Admin: revoke a code',
          'GET      ?action=channels': 'List active channels (Supabase table)',
        },
      });
    }

    // ── STATUS ──────────────────────────────────────────────────────────────
    // Proxied to bot — returns active codes, device counts, etc. from MongoDB
    if (action === 'status') {
      const botData = await callBot('status');
      return json({ success: true, ...botData });
    }

    // ── VERIFY ──────────────────────────────────────────────────────────────
    // 1. Frontend sends 6-digit code
    // 2. We generate a device_id from IP + User-Agent (stable per device)
    // 3. Bot checks MongoDB: is code valid? fewer than 2 devices? registers device
    // 4. Bot returns ok/fail
    if (action === 'verify') {
      const body = await getBody();
      const code = (body.code || '').trim();

      if (!code || code.length !== 6) {
        return json({ success: false, error: 'invalid_code' });
      }

      // Build a stable device fingerprint from IP + User-Agent
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               || req.headers.get('cf-connecting-ip')
               || 'unknown';
      const ua = req.headers.get('user-agent') || 'unknown';

      const enc    = new TextEncoder();
      const buf    = await crypto.subtle.digest('SHA-256', enc.encode(`${ip}::${ua}`));
      const device_id = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);

      let botData: any;
      try {
        botData = await callBot('verify', { code, device_id });
      } catch (err) {
        console.error('Bot API verify failed:', err);
        return json({
          success: false,
          error:   'bot_unavailable',
          message: 'Verification service is temporarily unavailable. Please try again.',
        }, 502);
      }

      if (!botData.ok) {
        if (String(botData.reason || '').toLowerCase().includes('maximum')) {
          return json({
            success:      false,
            error:        'max_devices',
            message:      `This code is already used on ${botData.devices_used || 2}/2 devices. Generate a new code from the bot.`,
            devices_used: botData.devices_used,
          });
        }
        return json({ success: false, error: 'invalid_code' });
      }

      return json({
        success:      true,
        telegram_user_id: botData.telegram_id,
        devices_used: botData.devices_used,
        devices_max:  botData.devices_max,
      });
    }

    // ── CHECK ───────────────────────────────────────────────────────────────
    // Read-only — checks if code is valid without registering a device
    if (action === 'check') {
      const body = await getBody();
      const code = (body.code || '').trim();
      if (!code) return json({ success: false, error: 'code_required' });

      let botData: any;
      try {
        botData = await callBot('check', { code });
      } catch {
        return json({ success: false, error: 'bot_unavailable' }, 502);
      }

      return json({ success: botData.ok, ...botData });
    }

    // ── REVOKE (admin) ──────────────────────────────────────────────────────
    // Proxied to bot — deletes code + its device records from MongoDB
    if (action === 'revoke') {
      const body = await getBody();
      const { code, telegram_user_id } = body;

      if (!code && !telegram_user_id) {
        return json({ success: false, error: 'Provide either code or telegram_user_id' }, 400);
      }

      let botData: any;
      try {
        botData = await callBot('revoke', { code, telegram_id: telegram_user_id });
      } catch {
        return json({ success: false, error: 'bot_unavailable' }, 502);
      }

      return json({ success: botData.ok, ...botData });
    }

    // ── CHANNELS ────────────────────────────────────────────────────────────
    // The only action that still reads from Supabase — admin manages channels
    // via the Owner Panel, bot reads them to show users which to join
    if (action === 'channels') {
      const { data } = await supabase
        .from('telegram_channels')
        .select('channel_name, channel_url')
        .eq('is_active', true);

      return json({ success: true, channels: data || [] });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);

  } catch (error) {
    console.error('Edge function error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
