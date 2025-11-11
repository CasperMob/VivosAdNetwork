-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Enable RLS on waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for public signup)
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Policy: Service role can read all (for admin operations)
CREATE POLICY "Service role can read waitlist" ON public.waitlist
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Service role can update waitlist
CREATE POLICY "Service role can update waitlist" ON public.waitlist
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

