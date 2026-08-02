import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nvssyuxghwlubxklvgrn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52c3N5dXhnaHdsdWJ4a2x2Z3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjI1NDgsImV4cCI6MjA4NjEzODU0OH0.O2kkd5tu-u-pKq9vVkTT7-4SnZ-kA1YBagdski-U8nQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = `test-${Math.random().toString(36).substring(7)}@example.com`;
  const password = "Password123!";
  
  console.log("Registering user:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error("Signup error:", error.message);
  } else {
    console.log("Signup success! Session:", data.session ? "Active" : "Null (requires email confirmation?)");
    console.log("User:", data.user?.id);
  }
}

test();
