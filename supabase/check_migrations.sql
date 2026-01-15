-- Check if migrations have been applied
-- Run this in Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
