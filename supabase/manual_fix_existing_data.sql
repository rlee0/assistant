-- IMPORTANT: Manual Fix for Existing Data
-- This script helps you assign orphaned chats/messages/checkpoints to users
-- You'll need to run this in your Supabase SQL Editor

-- Step 1: Check if there are any chats without user_id
SELECT COUNT(*) as chats_without_user, 
       (SELECT COUNT(*) FROM chats) as total_chats
FROM chats 
WHERE user_id IS NULL;

-- Step 2: Check current users in your system
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;

-- Step 3: MANUAL ACTION REQUIRED
-- If you only have one user or want to assign all chats to one user:
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from Step 2

-- UPDATE chats SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE messages SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE checkpoints SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL after fixing data
-- Uncomment these after you've assigned all user_ids:

-- ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE checkpoints ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Verify RLS is working
-- After making user_id NOT NULL, test with different users
-- Each user should only see their own data
