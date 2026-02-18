const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANIME_API = 'https://beat-anime-hind-hub-api.onrender.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Strip /anime-proxy prefix and forward remaining path+query to API
    const apiPath = url.pathname.replace('/anime-proxy', '') + url.search;
    const apiUrl = `${ANIME_API}${apiPath}`;

    const response = await fetch(apiUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
