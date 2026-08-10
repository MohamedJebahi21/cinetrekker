const supabaseUrl = "https://nvssyuxghwlubxklvgrn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52c3N5dXhnaHdsdWJ4a2x2Z3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjI1NDgsImV4cCI6MjA4NjEzODU0OH0.O2kkd5tu-u-pKq9vVkTT7-4SnZ-kA1YBagdski-U8nQ";

async function test() {
  const url = `${supabaseUrl}/functions/v1/tmdb-proxy?endpoint=%2Ftv%2F1396&language=en&maturity_level=none&include_adult=true`;
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "apikey": supabaseAnonKey
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response (truncated):", text.substring(0, 500));
}

test();
