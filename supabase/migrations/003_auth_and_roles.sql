-- Create public.users table to store user roles
-- This table extends auth.users with role information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'advertiser' CHECK (role IN ('admin', 'advertiser')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own record
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically create a public.users record when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role)
  VALUES (NEW.id, 'advertiser');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create public.users record on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update campaigns table to use user_id instead of advertiser_id
-- First, add the new column
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make advertiser_id nullable (we're transitioning to user_id)
ALTER TABLE public.campaigns 
  ALTER COLUMN advertiser_id DROP NOT NULL;

-- Migrate existing data: try to match advertisers.email to auth.users.email
-- Note: This is a best-effort migration. You may need to manually link users.
UPDATE public.campaigns c
SET user_id = (
  SELECT u.id 
  FROM auth.users u
  INNER JOIN public.advertisers a ON a.email = u.email
  WHERE a.id = c.advertiser_id
  LIMIT 1
)
WHERE c.user_id IS NULL;

-- Add impressions and clicks columns to campaigns for easier analytics
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC(10, 2) DEFAULT 0;

-- Update RLS policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can see own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;

-- Policy: Users can see their own campaigns
CREATE POLICY "Users can see own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can see all campaigns
CREATE POLICY "Admins can see all campaigns" ON public.campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage campaigns" ON public.campaigns
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- Function to update updated_at timestamp for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

