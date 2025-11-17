-- Comprehensive reset of RLS policies for users table
-- This migration removes ALL policies and recreates them from scratch

-- First, let's see what policies exist (for debugging - this will show in the output)
-- You can run this separately: SELECT * FROM pg_policies WHERE tablename = 'users';

-- Disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on users table (using a more aggressive approach)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create fresh policies

-- Policy 1: All authenticated users can read their own record
-- This is essential for auth checks in the frontend
CREATE POLICY "users_read_own_profile" ON public.users
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Service role can do everything
-- This is needed for admin API routes
CREATE POLICY "service_role_all_access" ON public.users
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

