# Database Setup Guide

## Quick Setup

Run this command to see the SQL you need to execute:

```bash
npm run setup-db
```

This will:
1. Check your environment variables
2. Display the SQL migration
3. Provide step-by-step instructions

## Manual Setup

If you prefer to set up manually:

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Add to `.env.local`

Create or update `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-key-here
```

### 3. Run the Migration SQL

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### 4. Verify Tables Were Created

1. In Supabase Dashboard, click **Table Editor**
2. You should see these tables:
   - `advertisers`
   - `campaigns`
   - `publishers`
   - `impressions`
   - `clicks`

### 5. Test the Connection

Visit: `http://localhost:3000/api/test-db`

You should see a success message if everything is set up correctly.

## Troubleshooting

### Error: "Could not find the table 'public.advertisers'"

**Solution**: The tables haven't been created yet. Run the migration SQL in Supabase SQL Editor.

### Error: "Database connection not configured"

**Solution**: Check your `.env.local` file has all required variables.

### Error: "relation does not exist"

**Solution**: Make sure you ran the entire migration SQL, not just part of it.

### Tables exist but still getting errors

**Solution**: 
1. Check the browser console for detailed error messages
2. Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Make sure the table schema matches the migration SQL


