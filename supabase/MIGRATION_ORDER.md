# Database Schema Migration Guide

## Overview

This document outlines the correct order for applying the consolidated Supabase migrations. The migrations have been refactored from the original accumulation of patches into a clean, linear history based on actual application code usage.

**Last Consolidated:** 2026-01-17

## Migration Strategy

The database now uses a minimal set of consolidated, well-structured migrations:

1. **0001_initial_schema.sql** - Core tables (chats, messages, checkpoints, settings)
2. **0002_security_and_triggers.sql** - RLS policies and automatic timestamp triggers
3. **0003_app_logic.sql** - Application-specific stored procedures

All migrations include:

- `IF NOT EXISTS` / `CREATE OR REPLACE` clauses for idempotency
- `SECURITY DEFINER` with `SET search_path = public` for security
- `ON DELETE CASCADE` for all foreign keys
- Row Level Security (RLS) enabled and configured
- Performance indexes on all tables

## Required Schema

### Chats Table

```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL (FK to auth.users ON DELETE CASCADE)
- title: TEXT NOT NULL DEFAULT 'New chat'
- model: TEXT (stores which AI model is used)
- context: TEXT (stores conversation context)
- is_pinned: BOOLEAN NOT NULL DEFAULT false
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

### Messages Table

```sql
- id: UUID PRIMARY KEY
- chat_id: UUID NOT NULL (FK to chats ON DELETE CASCADE)
- user_id: UUID NOT NULL (FK to auth.users ON DELETE CASCADE)
- role: TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system'))
- content: TEXT NOT NULL (can be JSON string)
- created_at: TIMESTAMPTZ NOT NULL
```

### Checkpoints Table

```sql
- id: UUID PRIMARY KEY
- chat_id: UUID NOT NULL (FK to chats ON DELETE CASCADE)
- user_id: UUID NOT NULL (FK to auth.users ON DELETE CASCADE)
- message_index: INTEGER NOT NULL DEFAULT 0
- timestamp: TIMESTAMPTZ NOT NULL
- created_at: TIMESTAMPTZ NOT NULL
```

### Settings Table

```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL UNIQUE (FK to auth.users ON DELETE CASCADE)
- data: JSONB NOT NULL DEFAULT '{}'
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

## Correct Migration Order

### Fresh Installation (Recommended)

Apply migrations in this exact order:

1. **`0001_initial_schema.sql`**
   - Creates: chats, messages, checkpoints, settings tables
   - Includes: All required columns with proper constraints
   - Sets up: Performance indexes on all tables
   - Enables: Row Level Security (RLS) on all tables
   - Foreign Keys: All with ON DELETE CASCADE
   - Timestamps: All use TIMESTAMPTZ (not TIMESTAMP)

2. **`0002_security_and_triggers.sql`**
   - Creates: RLS policies for all tables (16 policies total)
   - Includes: Full CRUD policies (SELECT, INSERT, UPDATE, DELETE) per table
   - Sets up: update_settings_updated_at() trigger function
   - Adds: Automatic timestamp trigger on settings table
   - Security: All functions use SET search_path = public

3. **`0003_app_logic.sql`**
   - Creates: delete_own_account() function
   - Security: SECURITY DEFINER with SET search_path = public
   - Purpose: Self-service account deletion with CASCADE
   - Permissions: Granted to authenticated users only

## How to Apply Migrations

### Using Supabase CLI (Recommended)

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
3. Copy and paste migration content in order:
   - `0001_initial_schema.sql`
   - `0002_security_and_triggers.sql`
   - `0003_app_logic.sql`
4. Execute each migration

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
- ✓ All foreign keys established with CASCADE DELETE
- ✓ `delete_own_account()` function exists
- ✓ `update_settings_updated_at()` trigger function exists
- ✓ All functions use `SET search_path = public` for security

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
- All foreign keys use ON DELETE CASCADE
- No NULL user_id values are allowed
- Automatic cascade delete when user account is removed

### Account Deletion

The `delete_own_account()` function provides secure self-service account deletion:

- Uses `SECURITY DEFINER` with `SET search_path = public` to prevent SQL injection
- Validates authentication via `auth.uid()`
- Deletes user from `auth.users`
- CASCADE DELETE automatically removes all related data:
  - chats (and their messages via cascade)
  - checkpoints (via cascade)
  - settings
- Only the authenticated user can delete their own account
- No service role key required

### Database Functions Security

All database functions follow security best practices:

- **`SET search_path = public`** - Prevents search path manipulation attacks
- **`SECURITY DEFINER`** - Elevates privileges only for specific operations
- **Input validation** - Functions validate user authentication
- **Explicit grants** - Only `authenticated` role has execute permissions

## Implementation Notes

- The `suggestions` field in ChatSession is NOT stored in the database (generated dynamically)
- Message `content` can be string or JSON (stored as TEXT, parsed by app)
- All timestamps use TIMESTAMPTZ for proper timezone handling
- All IDs use UUID for better distribution and security
- All foreign keys use ON DELETE CASCADE for automatic cleanup
- Migrations are idempotent (safe to run multiple times)

## Troubleshooting

### Migration Already Applied

Migrations use `IF NOT EXISTS` clauses - safe to re-run if needed.

### Missing Tables

Run migrations in exact order starting from `0001_initial_schema.sql`.

### RLS Policy Conflicts

Drop existing policies before re-running migrations, or use `RESET_AND_SETUP.sql` for clean slate.

## Old Migrations Archived

The following old migrations have been archived to `supabase/migrations/_archive/`:

- `20260100000000_create_initial_schema.sql` → Consolidated into 0001 and 0002
- `20260112132149_create_settings_table.sql` → Consolidated into 0001 and 0002
- `20260115220000_add_delete_user_function.sql` → Consolidated into 0003

These files are kept for reference but should not be used for new deployments.

### Function Already Exists

Use `CREATE OR REPLACE FUNCTION` (already in migrations) to update functions.
