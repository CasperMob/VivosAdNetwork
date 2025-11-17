-- Fix RLS policies for users table to ensure all roles can read their own profile
-- This migration ensures admins, advertisers, and publishers can all read their own user records

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Publishers can read own profile" ON public.users;
DROP POLICY IF EXISTS "Advertisers can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

-- Policy: All authenticated users can read their own record (regardless of role)
-- This covers admins, advertisers, and publishers reading their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Service role can manage all users
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

