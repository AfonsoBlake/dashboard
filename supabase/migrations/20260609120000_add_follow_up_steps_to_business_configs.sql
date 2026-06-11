ALTER TABLE public.business_configs
ADD COLUMN IF NOT EXISTS follow_up_steps jsonb NOT NULL DEFAULT '[]'::jsonb;
