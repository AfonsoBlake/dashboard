// Secondary Supabase client for the fittrial-command-center project.
// TEMPORARILY DISABLED — initialization is skipped so it does not run on
// app load or interfere with the primary Supabase auth flow.
// Replace the anon key and re-enable when ready.

import type { SupabaseClient } from "@supabase/supabase-js";

// No-op stub. Any `.from(...)` call returns an error result so callers
// using supabaseCC won't crash, but no network requests are made.
const disabledError = {
  message: "supabaseCC is temporarily disabled",
  details: "",
  hint: "",
  code: "DISABLED",
};

const stubBuilder: any = {
  select: () => Promise.resolve({ data: null, error: disabledError }),
  insert: () => Promise.resolve({ data: null, error: disabledError }),
  update: () => ({
    eq: () => Promise.resolve({ data: null, error: disabledError }),
  }),
  delete: () => Promise.resolve({ data: null, error: disabledError }),
  eq: () => stubBuilder,
  maybeSingle: () => Promise.resolve({ data: null, error: disabledError }),
  single: () => Promise.resolve({ data: null, error: disabledError }),
};

export const supabaseCC = {
  from: () => stubBuilder,
} as unknown as SupabaseClient;
