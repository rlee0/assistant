# Database Schema Migration Guide

## Overview

This document outlines the correct order for applying Supabase migrations to align the database with the application requirements.

## Current Issues Identified

1. **Missing Base Tables**: The migrations assume tables exist but never CREATE them
2. **Missing `context` column**: App stores conversation context but column doesn't exist in `chats` table
3. **Missing `model` column**: App stores selected model but column doesn't exist in `chats` table
4. **Inconsistent migration order**: Some migrations reference columns before they're created

## Required Schema

### Chats Table

```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL (FK to auth.users)
- title: TEXT NOT NULL
- model: TEXT (stores which AI model is used)
- context: TEXT (stores conversation context)
- is_pinned: BOOLEAN NOT NULL DEFAULT false
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

### Messages Table

```sql
- id: UUID PRIMARY KEY
- chat_id: UUID NOT NULL (FK to chats)
- user_id: UUID NOT NULL (FK to auth.users)
- role: TEXT NOT NULL (user/assistant/system)
- content: TEXT NOT NULL (can be JSON string)
- created_at: TIMESTAMPTZ NOT NULL
```

### Checkpoints Table

```sql
- id: UUID PRIMARY KEY
- chat_id: UUID NOT NULL (FK to chats)
- user_id: UUID NOT NULL (FK to auth.users)
- message_index: INTEGER NOT NULL
- timestamp: TIMESTAMPTZ NOT NULL
- created_at: TIMESTAMPTZ NOT NULL
```

### Settings Table

```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL UNIQUE (FK to auth.users)
- data: JSONB NOT NULL
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

## Correct Migration Order

### Fresh Installation (Recommended)

If starting fresh, apply migrations in this order:

1. `20260100000000_create_initial_schema.sql` - Creates base tables (chats, messages, checkpoints)
2. `20260112132149_create_settings_table.sql` - Creates settings table
3. `20260112140000_add_data_column_to_settings.sql` - Adds data column to settings
4. `20260112141500_update_settings_schema.sql` - Updates settings schema
5. `20260115080000_add_missing_chat_columns.sql` - Adds model/context columns (idempotent)
6. `20260115220000_add_delete_user_function.sql` - Adds delete_own_account() function for secure account deletion

### Existing Database (Migration Path)

If you have an existing database, apply these migrations:

1. First, verify current state:

   ```sql
   -- Run verify_complete_schema.sql
   ```

2. Apply missing table columns:

   ```sql
   -- Apply 20260115080000_add_missing_chat_columns.sql
   ```

3. Verify schema is complete:
   ```sql
   -- Run verify_complete_schema.sql again
   ```

## How to Apply Migrations

### Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply all migrations in order
supabase db push
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste migration content
4. Run each migration in order

### Quick Development Reset

For development environments only (⚠️ **DELETES ALL DATA**):

```sql
-- Run RESET_AND_SETUP.sql in SQL Editor
-- This completely resets the database with correct schema
```

## Verification

After applying migrations, run the verification script:

```sql
-- Run: supabase/verify_complete_schema.sql
```

Expected results:

- ✓ All tables exist (4 tables: chats, messages, checkpoints, settings)
- ✓ All columns present in each table
- ✓ RLS enabled on all tables
- ✓ All RLS policies created (4 per table = 16 total)
- ✓ All indexes created
- ✓ All foreign keys established
- ✓ `delete_own_account()` function exists for secure account deletion

## App Type Definitions Alignment

The database schema now matches these TypeScript types:

### ChatSession ([src/features/chat/types.ts](../src/features/chat/types.ts))

```typescript
type ChatSession = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  model: string; // ← Now stored in DB
  context?: string; // ← Now stored in DB
  suggestions: string[]; // (not stored in DB, generated on-the-fly)
  messages: ChatMessage[];
  checkpoints: ChatCheckpoint[];
};
```

### ChatMessage

```typescript
type ChatMessage = ModelMessage & {
  id: string;
  createdAt: string;
};
```

### ChatCheckpoint

```typescript
type ChatCheckpoint = {
  id: string;
  messageIndex: number; // ← Now properly stored
  timestamp: string;
};
```

## Security Considerations

All tables have Row Level Security (RLS) enabled with policies that ensure:

- Users can only read their own data
- Users can only insert/update/delete their own data
- No NULL user_id values are allowed
- Cascade deletes when user account is deleted

### Account Deletion

The `delete_own_account()` function provides a secure way for users to delete their accounts:

- Uses `SECURITY DEFINER` to elevate privileges only for this specific operation
- Validates that the user is authenticated before deletion
- Automatically cascades to delete all related data (chats, messages, checkpoints, settings)
- No service role key required (modern approach)
- Only the authenticated user can delete their own account

**How it works:**

1. User initiates account deletion from the app
2. API route calls `supabase.rpc('delete_own_account')`
3. Function validates the user is authenticated
4. Function deletes the user from `auth.users`
5. CASCADE DELETE automatically removes all related records
6. User is signed out and redirected to login

## Notes

- The `suggestions` field in ChatSession is NOT stored in the database (generated dynamically)
- Message `content` can be either string or JSON (stored as TEXT, parsed by app)
- All timestamps are stored as TIMESTAMPTZ for proper timezone handling
- UUIDs are used for all primary keys for better distribution and security
