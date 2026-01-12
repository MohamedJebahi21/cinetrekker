import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    
    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const language = url.searchParams.get('language') || 'en';
    const query = url.searchParams.get('query') || '';
    const page = url.searchParams.get('page') || '1';

    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    // Build TMDB URL
    let tmdbUrl = `${TMDB_BASE_URL}${endpoint}`;
    const separator = tmdbUrl.includes('?') ? '&' : '?';
    tmdbUrl += `${separator}language=${language}`;

    if (query) {
      tmdbUrl += `&query=${encodeURIComponent(query)}`;
    }
    if (page) {
      tmdbUrl += `&page=${page}`;
    }
    tmdbUrl += '&include_adult=false';

    // TMDB supports either:
    // - v4 "API Read Access Token" via Authorization: Bearer <token> (JWT-like, contains '.')
    // - v3 "API Key" via ?api_key=<key> query param
    const isV4Token = TMDB_API_KEY.includes('.');
    if (!isV4Token) {
      tmdbUrl += `&api_key=${encodeURIComponent(TMDB_API_KEY)}`;
    }

    console.log(`Fetching TMDB: ${tmdbUrl}`);

    const response = await fetch(tmdbUrl, {
      headers: isV4Token
        ? {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json',
          }
        : {
            'Content-Type': 'application/json',
          },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error: ${response.status} - ${errorText}`);
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in tmdb-proxy:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
