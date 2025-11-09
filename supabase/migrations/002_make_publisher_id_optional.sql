-- Make publisher_id optional in impressions and clicks tables
-- This allows tracking impressions and clicks for chatbot owners without requiring publisher_id

-- Drop the foreign key constraint on impressions.publisher_id
ALTER TABLE impressions 
  DROP CONSTRAINT IF EXISTS impressions_publisher_id_fkey;

-- Make publisher_id nullable in impressions table
ALTER TABLE impressions 
  ALTER COLUMN publisher_id DROP NOT NULL;

-- Re-add the foreign key constraint but allow NULL
ALTER TABLE impressions 
  ADD CONSTRAINT impressions_publisher_id_fkey 
  FOREIGN KEY (publisher_id) 
  REFERENCES publishers(id) 
  ON DELETE CASCADE;

-- Drop the foreign key constraint on clicks.publisher_id
ALTER TABLE clicks 
  DROP CONSTRAINT IF EXISTS clicks_publisher_id_fkey;

-- Make publisher_id nullable in clicks table
ALTER TABLE clicks 
  ALTER COLUMN publisher_id DROP NOT NULL;

-- Re-add the foreign key constraint but allow NULL
ALTER TABLE clicks 
  ADD CONSTRAINT clicks_publisher_id_fkey 
  FOREIGN KEY (publisher_id) 
  REFERENCES publishers(id) 
  ON DELETE CASCADE;

-- Make keyword optional in impressions table (for chatbot tracking)
ALTER TABLE impressions 
  ALTER COLUMN keyword DROP NOT NULL;

