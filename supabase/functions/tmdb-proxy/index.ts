import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://id-preview--d285a624-146f-4e47-902a-6348ef29940b.lovable.app',
  'https://d285a624-146f-4e47-902a-6348ef29940b.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is in allowed list or matches lovable patterns
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.lovable.app') || 
    origin.endsWith('.lovableproject.com');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Parameters that should not be forwarded to TMDB
const EXCLUDED_PARAMS = new Set(['endpoint']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

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
