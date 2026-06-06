
-- Add inbox-specific columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_tag text,
  ADD COLUMN IF NOT EXISTS lead_status text,
  ADD COLUMN IF NOT EXISTS ai_score text,
  ADD COLUMN IF NOT EXISTS ai_score_reason text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Quick replies on gym_configs (JSON array of strings)
ALTER TABLE public.gym_configs
  ADD COLUMN IF NOT EXISTS quick_replies jsonb DEFAULT '[]'::jsonb;

-- Allow approved users to UPDATE conversations (for tags/status/resolved/staff replies)
DROP POLICY IF EXISTS "approved update conversations" ON public.conversations;
CREATE POLICY "approved update conversations"
  ON public.conversations
  FOR UPDATE
  USING (is_approved())
  WITH CHECK (is_approved());

-- Allow approved users to UPDATE gym_configs (for quick replies edit later)
DROP POLICY IF EXISTS "approved update gym_configs" ON public.gym_configs;
CREATE POLICY "approved update gym_configs"
  ON public.gym_configs
  FOR UPDATE
  USING (is_approved())
  WITH CHECK (is_approved());
