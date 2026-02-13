import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://cinetrekker.vercel.app',      // Production
  'https://www.cinetrekker.vercel.app',  // Production with www (if used)
  'http://localhost:5173',                // Vite dev (default)
  'http://localhost:5174',                // Vite dev (alternate)
  'http://localhost:8080',                // Custom dev port
  'http://localhost:4173',                // Vite preview
];

// Regex pattern for Vercel preview deployments
const VERCEL_PREVIEW_PATTERN = /^https:\/\/cinetrekker-[a-z0-9-]+\.vercel\.app$/;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is in allowed list or matches preview pattern
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_PATTERN.test(origin);
  
  // Fallback to production domain instead of localhost
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Parameters that should not be forwarded to TMDB
const EXCLUDED_PARAMS = new Set(['endpoint']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // No Content
      headers: corsHeaders 
    });
  }

  try {
    // Log origin for debugging
    const origin = req.headers.get('origin') || 'unknown';
    console.log(`[TMDB Proxy] Request from origin: ${origin}`);
    
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    
    if (!TMDB_API_KEY) {
      console.error('[TMDB Proxy] TMDB_API_KEY not found in environment');
      throw new Error('TMDB_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }
    
    console.log(`[TMDB Proxy] Forwarding request to endpoint: ${endpoint}`);

    // Build TMDB URL - forward ALL query parameters except 'endpoint'
    const tmdbParams = new URLSearchParams();
    
    for (const [key, value] of url.searchParams.entries()) {
      if (!EXCLUDED_PARAMS.has(key) && value) {
        tmdbParams.set(key, value);
      }
    }
    
    // Set defaults if not provided
    if (!tmdbParams.has('language')) {
      tmdbParams.set('language', 'en');
    }
    if (!tmdbParams.has('page')) {
      tmdbParams.set('page', '1');
    }
    tmdbParams.set('include_adult', 'false');

    // TMDB supports either:
    // - v4 "API Read Access Token" via Authorization: Bearer <token> (JWT-like, contains '.')
    // - v3 "API Key" via ?api_key=<key> query param
    const isV4Token = TMDB_API_KEY.includes('.');
    if (!isV4Token) {
      tmdbParams.set('api_key', TMDB_API_KEY);
    }

    const tmdbUrl = `${TMDB_BASE_URL}${endpoint}?${tmdbParams.toString()}`;
    console.log(`[TMDB Proxy] Fetching TMDB: ${endpoint}`);

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
