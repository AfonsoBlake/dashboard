// Secondary Supabase client used to read & resolve escalated_questions.
// Hardcoded per integration spec.
import { createClient } from "@supabase/supabase-js";

export const betterZapClient = createClient(
  "https://ldkrxbpoixookrwmdufk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka3J4YnBvaXhvb2tyd21kdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU5NzQsImV4cCI6MjA4ODcxMTk3NH0.ED2WltgKqUfl149-EwW34vsGgNSn7l1jC7b16Pw68Ow",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export type EscalatedQuestion = {
  id: string;
  contact_id: string | null;
  question: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  created_at: string | null;
  business_id: string;
};
