import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Environment-based CORS configuration
// Only allow localhost if NOT in production AND NOT deployed
const isDev = Deno.env.get('ENVIRONMENT') !== 'production' && 
              Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;

const ALLOWED_ORIGINS = [
  'https://cinetrekker.vercel.app',
  'https://www.cinetrekker.vercel.app',
  ...(isDev ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://localhost:4173',
  ] : [])
];

const VERCEL_PREVIEW_PATTERN = /^https:\/\/cinetrekker-[a-z0-9-]+\.vercel\.app$/;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // LOGIC FIX: We check if the origin is allowed. If not, we EXPLICITLY 
  // return the production URL instead of letting it fall back to a local one.
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_PATTERN.test(origin);
  const allowedOrigin = isAllowed ? origin : 'https://cinetrekker.vercel.app';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const EXCLUDED_PARAMS = new Set(['endpoint']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    if (!TMDB_API_KEY) {
      console.error('[TMDB Proxy] TMDB_API_KEY not found');
      throw new Error('TMDB_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    // 2. Build TMDB URL
    const tmdbParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!EXCLUDED_PARAMS.has(key) && value) {
        tmdbParams.set(key, value);
      }
    }

    if (!tmdbParams.has('language')) tmdbParams.set('language', 'en');
    if (!tmdbParams.has('page')) tmdbParams.set('page', '1');
    tmdbParams.set('include_adult', 'false');

    const isV4Token = TMDB_API_KEY.includes('.');
    if (!isV4Token) {
      tmdbParams.set('api_key', TMDB_API_KEY);
    }

    const tmdbUrl = `${TMDB_BASE_URL}${endpoint}?${tmdbParams.toString()}`;
    
    // 3. Fetch from TMDB
    const response = await fetch(tmdbUrl, {
      headers: isV4Token
        ? {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json',
          }
        : { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error: ${response.status} - ${errorText}`);
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    // 4. Return Response
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
