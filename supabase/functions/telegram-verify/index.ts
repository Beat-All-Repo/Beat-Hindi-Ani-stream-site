const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-secret',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiSecret = Deno.env.get('TELEGRAM_API_SECRET')!;
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // --- Auth: X-API-Secret header OR ?secret= OR JSON body 'secret' field ---
  const headerSecret = req.headers.get('x-api-secret');
  const querySecret = url.searchParams.get('secret');

  // For actions that need bot auth (status, check, revoke, generate)
  const botActions = ['status', 'check', 'revoke', 'generate'];
  // Actions that are public (frontend facing)
  const publicActions = ['channels', 'verify', 'claim'];

  let authenticated = false;
  let bodyData: any = null;

  if (publicActions.includes(action || '')) {
    authenticated = true; // public endpoints
  } else if (headerSecret === apiSecret || querySecret === apiSecret) {
    authenticated = true;
  } else if (req.method === 'POST') {
    // Clone request to read body for secret check
    try {
      bodyData = await req.json();
      if (bodyData?.secret === apiSecret) {
        authenticated = true;
      }
    } catch {
      // body parse failed
    }
  }

  if (!authenticated) {
    return new Response(JSON.stringify({
      success: false,
      error: 'unauthorized',
      auth: 'X-API-Secret header OR ?secret= OR JSON body "secret" field',
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Helper to get body (already parsed or parse now)
  const getBody = async () => {
    if (bodyData !== null) return bodyData;
    try {
      bodyData = await req.json();
      return bodyData;
    } catch {
      return {};
    }
  };

  try {
    // --- API info ---
    if (!action) {
      return new Response(JSON.stringify({
        service: 'Telegram Verification Bot API',
        auth: 'X-API-Secret header OR ?secret= OR JSON body "secret" field',
        endpoints: {
          'GET|POST /telegram-verify?action=status': 'Global stats',
          'POST     /telegram-verify?action=check': 'Check code (no device registration)',
          'POST     /telegram-verify?action=revoke': 'Admin: revoke a code',
          'POST     /telegram-verify?action=verify': 'Verify code + register device',
          'POST     /telegram-verify?action=generate': 'Generate code after channel check',
          'GET      /telegram-verify?action=channels': 'List active channels (public)',
          'POST     /telegram-verify?action=claim': 'Claim code after signup (auth required)',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: bot checks active codes / user limit
    if (action === 'status') {
      const { data: activeCodes } = await supabase
        .from('access_codes')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      const { count: totalUsed } = await supabase
        .from('access_codes')
        .select('*', { count: 'exact', head: true })
        .eq('is_used', true);

      const { count: totalCodes } = await supabase
        .from('access_codes')
        .select('*', { count: 'exact', head: true });

      const maxConcurrent = 2;
      const activeCount = activeCodes?.length || 0;
      const canGenerate = activeCount < maxConcurrent;

      return new Response(JSON.stringify({
        success: true,
        active_codes: activeCount,
        max_concurrent: maxConcurrent,
        can_generate: canGenerate,
        total_used: totalUsed || 0,
        total_codes: totalCodes || 0,
        active_users: activeCodes?.map(c => ({
          telegram_user_id: c.telegram_user_id,
          code: c.code,
          expires_at: c.expires_at,
          created_at: c.created_at,
        })) || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check code validity (no side effects)
    if (action === 'check') {
      const body = await getBody();
      const { code } = body;
      if (!code) throw new Error('code required');

      const { data: codeData } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (!codeData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'invalid_code',
          message: 'Code is invalid, expired, or already used.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        code: codeData.code,
        telegram_user_id: codeData.telegram_user_id,
        expires_at: codeData.expires_at,
        created_at: codeData.created_at,
        is_used: codeData.is_used,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: admin revoke a code
    if (action === 'revoke') {
      const body = await getBody();
      const { code, telegram_user_id } = body;

      if (!code && !telegram_user_id) {
        throw new Error('code or telegram_user_id required');
      }

      let query = supabase.from('access_codes').delete();
      if (code) {
        query = query.eq('code', code);
      } else {
        query = query.eq('telegram_user_id', telegram_user_id).eq('is_used', false);
      }

      const { data, error: delError } = await query.select();

      if (delError) throw new Error(delError.message);

      return new Response(JSON.stringify({
        success: true,
        revoked_count: data?.length || 0,
        message: data?.length ? 'Code(s) revoked successfully.' : 'No matching active codes found.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: get channels for frontend (public)
    if (action === 'channels') {
      const { data } = await supabase.from('telegram_channels').select('*').eq('is_active', true);
      return new Response(JSON.stringify({ success: true, channels: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check membership & generate code
    if (action === 'generate') {
      const body = await getBody();
      const telegramUserId = body.telegram_user_id;
      if (!telegramUserId) throw new Error('telegram_user_id required');

      // Enforce max 2 concurrent active codes
      const { data: activeCodes } = await supabase
        .from('access_codes')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      const activeCount = activeCodes?.length || 0;
      const alreadyHasCode = activeCodes?.find(c => c.telegram_user_id === telegramUserId);

      // If user already has an active code, return it
      if (alreadyHasCode) {
        return new Response(JSON.stringify({
          success: true,
          code: alreadyHasCode.code,
          expires_at: alreadyHasCode.expires_at,
          existing: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (activeCount >= 2) {
        return new Response(JSON.stringify({
          success: false,
          error: 'max_users_reached',
          message: 'Maximum 2 concurrent users allowed. Please try again later.',
          active_count: activeCount,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active channels
      const { data: channels } = await supabase.from('telegram_channels').select('*').eq('is_active', true);
      if (!channels || channels.length === 0) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await supabase.from('access_codes').insert({
          code,
          telegram_user_id: telegramUserId,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        return new Response(JSON.stringify({ success: true, code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check membership in all channels
      const notJoined: string[] = [];
      for (const ch of channels) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${ch.channel_id}&user_id=${telegramUserId}`
          );
          const data = await res.json();
          const status = data?.result?.status;
          if (!status || ['left', 'kicked'].includes(status)) {
            notJoined.push(ch.channel_name);
          }
        } catch {
          notJoined.push(ch.channel_name);
        }
      }

      if (notJoined.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'not_member',
          not_joined: notJoined,
          channels: channels.map(c => ({ name: c.channel_name, url: c.channel_url })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('access_codes').insert({
        code,
        telegram_user_id: telegramUserId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      return new Response(JSON.stringify({ success: true, code, expires_in: '30 minutes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: verify code + register device (frontend)
    if (action === 'verify') {
      const body = await getBody();
      const { code } = body;
      if (!code) throw new Error('code required');

      const { data: codeData } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (!codeData) {
        return new Response(JSON.stringify({ success: false, error: 'invalid_code' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, telegram_user_id: codeData.telegram_user_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: mark code as used (after user signs up)
    if (action === 'claim') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Auth required');

      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!user) throw new Error('Invalid token');

      const body = await getBody();
      const { code } = body;

      await supabase.from('access_codes').update({ is_used: true, used_by: user.id }).eq('code', code);
      await supabase.from('profiles').update({ telegram_verified: true }).eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
