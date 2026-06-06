// Supabase client for the active project (ldkrxbpoixookrwmdufk).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ldkrxbpoixookrwmdufk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka3J4YnBvaXhvb2tyd21kdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU5NzQsImV4cCI6MjA4ODcxMTk3NH0.ED2WltgKqUfl149-EwW34vsGgNSn7l1jC7b16Pw68Ow";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
