const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // Action: get channels for frontend
    if (action === 'channels') {
      const { data } = await supabase.from('telegram_channels').select('*').eq('is_active', true);
      return new Response(JSON.stringify({ success: true, channels: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check membership & generate code
    if (action === 'generate') {
      const body = await req.json();
      const telegramUserId = body.telegram_user_id;
      if (!telegramUserId) throw new Error('telegram_user_id required');

      // Get active channels
      const { data: channels } = await supabase.from('telegram_channels').select('*').eq('is_active', true);
      if (!channels || channels.length === 0) {
        // No channels configured, auto-approve
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

      // All joined - generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('access_codes').insert({
        code,
        telegram_user_id: telegramUserId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      });

      return new Response(JSON.stringify({ success: true, code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: verify code
    if (action === 'verify') {
      const body = await req.json();
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

      const body = await req.json();
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
