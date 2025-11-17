-- Add publisher role to the users table
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'advertiser', 'publisher'));

-- Add publisher_id column to link users to publishers
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL;

-- Create index on publisher_id
CREATE INDEX IF NOT EXISTS idx_users_publisher_id ON public.users(publisher_id);

-- Update RLS policies to include publishers
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Publishers can read own profile" ON public.users;

-- Policy: Publishers can read their own record
CREATE POLICY "Publishers can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id AND role = 'publisher');

-- Update publishers table RLS policies
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Publishers can read own data" ON public.publishers;
DROP POLICY IF EXISTS "Service role can manage publishers" ON public.publishers;

-- Policy: Publishers can read their own publisher record
CREATE POLICY "Publishers can read own data" ON public.publishers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND publisher_id = publishers.id
    )
  );

-- Policy: Service role can manage publishers
CREATE POLICY "Service role can manage publishers" ON public.publishers
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Update impressions RLS policies
ALTER TABLE public.impressions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Publishers can read own impressions" ON public.impressions;
DROP POLICY IF EXISTS "Service role can manage impressions" ON public.impressions;

-- Policy: Publishers can read their own impressions
CREATE POLICY "Publishers can read own impressions" ON public.impressions
  FOR SELECT USING (
    publisher_id IN (
      SELECT publisher_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can manage impressions
CREATE POLICY "Service role can manage impressions" ON public.impressions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Update clicks RLS policies
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Publishers can read own clicks" ON public.clicks;
DROP POLICY IF EXISTS "Service role can manage clicks" ON public.clicks;

-- Policy: Publishers can read their own clicks
CREATE POLICY "Publishers can read own clicks" ON public.clicks
  FOR SELECT USING (
    publisher_id IN (
      SELECT publisher_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Service role can manage clicks
CREATE POLICY "Service role can manage clicks" ON public.clicks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

