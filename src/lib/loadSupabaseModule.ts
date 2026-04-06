import { supabase } from "@/integrations/supabase/client";

export async function loadSupabaseModule() {
  return { supabase };
}