-- Add analytics fields to impressions table for device and publisher data
ALTER TABLE public.impressions
  ADD COLUMN IF NOT EXISTS device_os TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS matched_keyword TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS screen_width INT,
  ADD COLUMN IF NOT EXISTS screen_height INT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index on device_os for analytics queries
CREATE INDEX IF NOT EXISTS idx_impressions_device_os ON public.impressions(device_os);

-- Create index on matched_keyword for analytics
CREATE INDEX IF NOT EXISTS idx_impressions_matched_keyword ON public.impressions(matched_keyword);

-- Create index on device_type for analytics
CREATE INDEX IF NOT EXISTS idx_impressions_device_type ON public.impressions(device_type);

