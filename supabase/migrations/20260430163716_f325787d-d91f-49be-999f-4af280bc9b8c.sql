ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS ai_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_paused_at timestamptz;