# Authentication & Multi-User Setup Guide

This guide will help you set up authentication and multi-user roles for Redefining Ads.

## Prerequisites

1. Complete the initial database setup (see `SETUP.md`)
2. Run the new migration for authentication

## Step 1: Run Database Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/003_auth_and_roles.sql`
3. Paste and run it in the SQL Editor
4. Verify that the `public.users` table was created

## Step 2: Set Up Admin User

### Option A: Using the Setup Script (Recommended)

1. Add admin credentials to your `.env.local` file:
```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password_here
```

2. Run the setup script:
```bash
npm run setup-admin
```

This will:
- Create an admin user in Supabase Auth
- Set their role to `admin` in the `public.users` table
- Allow them to sign in at `/signin`

### Option B: Manual Setup

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Go to SQL Editor and run:
```sql
UPDATE public.users
SET role = 'admin'
WHERE id = 'YOUR_USER_ID_HERE';
```

## Step 3: Disable Public Signup

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Auth Providers" → "Email", disable "Enable email signup"
3. This ensures only admins can create new users

## Step 4: Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000`
3. You should be redirected to `/signin`
4. Sign in with your admin credentials
5. You should be redirected to `/admin`

## User Roles

### Admin
- Can access `/admin` dashboard
- Can create, view, and delete advertiser accounts
- Can view all campaigns
- Can change their password

### Advertiser
- Can access `/onboard` to create campaigns
- Can access `/analytics` to view their campaign metrics
- Can only see their own campaigns
- Cannot create other users

## Creating Advertiser Accounts

1. Sign in as admin
2. Go to `/admin` → Users tab
3. Click "Add Advertiser"
4. Enter email and password
5. The new user will be created with role `advertiser`
6. They can now sign in at `/signin`

## Route Protection

The middleware automatically:
- Redirects unauthenticated users to `/signin`
- Redirects admins to `/admin`
- Redirects advertisers to `/onboard` (if no campaigns) or `/analytics` (if they have campaigns)
- Protects routes based on user roles

## Troubleshooting

### "Unauthorized" errors
- Make sure you've run the migration `003_auth_and_roles.sql`
- Verify the `public.users` table exists
- Check that your user has a role set in the `users` table

### Admin user not working
- Verify the user exists in `auth.users`
- Check that `public.users` has a record with `role = 'admin'`
- Try running the setup script again

### Can't create advertiser accounts
- Make sure you're signed in as admin
- Check that public signup is disabled in Supabase Auth settings
- Verify the API route `/api/admin/users` is accessible

