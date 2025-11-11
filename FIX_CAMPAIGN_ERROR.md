# Fix Campaign Creation Error

## Problem
When trying to save a campaign as an advertiser, you get this error:
```
null value in column "advertiser_id" of relation "campaigns" violates not-null constraint
```

## Solution

The `advertiser_id` column still has a NOT NULL constraint, but we're now using `user_id` instead. Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE public.campaigns 
  ALTER COLUMN advertiser_id DROP NOT NULL;
```

Or run the migration file:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/004_fix_advertiser_id_nullable.sql`
3. Paste and run it

## Why This Happened

The original schema had `advertiser_id` as NOT NULL. When we migrated to use `user_id` for authentication, we added the new column but didn't make the old one nullable. This fix allows campaigns to be created with only `user_id` (and `advertiser_id` can be NULL for new campaigns).

## After Running the Fix

1. Try creating a campaign again as an advertiser
2. The campaign should now save successfully
3. The campaign will be linked to your authenticated user account
4. You'll be able to see it in the analytics dashboard

