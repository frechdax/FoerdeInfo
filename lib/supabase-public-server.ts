import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://wggtdpyzkeneyfywcume.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_goBV5794K15cywyrAFSRpg_RdEpycrg";

export function createPublicServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      FALLBACK_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
