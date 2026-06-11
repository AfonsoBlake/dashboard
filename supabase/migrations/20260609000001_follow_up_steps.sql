-- Add per-step follow-up config to business_configs
ALTER TABLE business_configs
ADD COLUMN IF NOT EXISTS follow_up_steps jsonb DEFAULT '[]';

-- Add follow-up tracking columns to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_active boolean DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_message text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
