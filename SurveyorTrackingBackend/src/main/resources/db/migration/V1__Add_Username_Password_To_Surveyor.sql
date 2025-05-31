-- Add username column with unique constraint
ALTER TABLE surveyor ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Add password column
ALTER TABLE surveyor ADD COLUMN IF NOT EXISTS password VARCHAR(255);
