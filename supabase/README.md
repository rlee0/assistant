# Supabase Database

This directory contains all database migrations and utility scripts for the AI Assistant application.

## 📁 Structure

```
supabase/
├── migrations/              # Database migrations (apply in order)
│   ├── 20260100000000_create_initial_schema.sql
│   ├── 20260112132149_create_settings_table.sql
│   └── 20260115220000_add_delete_user_function.sql
├── schema.sql                # Complete schema reference (DO NOT run directly)
├── verify_complete_schema.sql    # Verify database schema
├── RESET_AND_SETUP.sql           # Development reset (⚠️ deletes data)
└── MIGRATION_ORDER.md            # Detailed migration guide
```

## 🚀 Quick Start

### Fresh Setup

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor:
# 1. Run migrations in order (see migrations/ folder)
# 2. Verify with verify_complete_schema.sql
```

### Development Reset

```sql
-- ⚠️ WARNING: This deletes ALL data!
-- Run RESET_AND_SETUP.sql in SQL Editor
```

### Verify Schema

```sql
-- Run verify_complete_schema.sql in SQL Editor
-- Check for ✓ marks indicating correct setup
```

## 📊 Database Schema

### Tables

#### **chats** - Conversation sessions

- `id` (UUID, PRIMARY KEY) - Unique chat identifier
- `user_id` (UUID, NOT NULL) - Foreign key to auth.users with CASCADE DELETE
- `title` (TEXT, NOT NULL) - Chat display name
- `model` (TEXT) - AI model used for this chat
- `context` (TEXT) - Conversation context/system prompt
- `is_pinned` (BOOLEAN, DEFAULT false) - Pin status for UI
- `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL) - Last update timestamp

#### **messages** - Chat messages

- `id` (UUID, PRIMARY KEY) - Unique message identifier
- `chat_id` (UUID, NOT NULL) - Foreign key to chats with CASCADE DELETE
- `user_id` (UUID, NOT NULL) - Foreign key to auth.users with CASCADE DELETE
- `role` (TEXT, NOT NULL) - Message role: 'user', 'assistant', or 'system'
- `content` (TEXT, NOT NULL) - Message content (can be JSON string)
- `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp

#### **checkpoints** - Conversation restore points

- `id` (UUID, PRIMARY KEY) - Unique checkpoint identifier
- `chat_id` (UUID, NOT NULL) - Foreign key to chats with CASCADE DELETE
- `user_id` (UUID, NOT NULL) - Foreign key to auth.users with CASCADE DELETE
- `message_index` (INTEGER, NOT NULL) - Message position in conversation
- `timestamp` (TIMESTAMPTZ, NOT NULL) - Checkpoint timestamp
- `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp

#### **settings** - User preferences

- `id` (UUID, PRIMARY KEY) - Unique settings identifier
- `user_id` (UUID, NOT NULL, UNIQUE) - Foreign key to auth.users with CASCADE DELETE
- `data` (JSONB, NOT NULL, DEFAULT '{}') - User settings as JSON
- `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL) - Last update timestamp

### Functions

#### **delete_own_account()** - Secure account deletion

- **Purpose**: Allows authenticated users to delete their own account
- **Security**: Uses `SECURITY DEFINER` with `SET search_path = public` to prevent SQL injection
- **Behavior**:
  - Validates user is authenticated via `auth.uid()`
  - Deletes user from `auth.users` table
  - CASCADE DELETE automatically removes all related data
- **Usage**: Called via `supabase.rpc('delete_own_account')`
- **Permissions**: Granted to `authenticated` role only

#### **update_settings_updated_at()** - Automatic timestamp updates

- **Purpose**: Trigger function to update `updated_at` timestamp on settings changes
- **Security**: Uses `SECURITY DEFINER` with `SET search_path = public`
- **Behavior**: Automatically sets `updated_at = NOW()` on UPDATE operations
- **Trigger**: Fires BEFORE UPDATE on `settings` table

### Security

- ✓ Row Level Security (RLS) enabled on all tables
- ✓ User isolation enforced (users only see their own data)
- ✓ Cascade deletes when user account is removed
- ✓ Secure account deletion via `delete_own_account()` function
- ✓ All functions use `SET search_path = public` to prevent SQL injection

### Performance

- ✓ Indexes on all foreign keys
- ✓ Composite indexes for common queries
- ✓ Optimized for user-scoped queries

## 📖 Documentation

- **[MIGRATION_ORDER.md](MIGRATION_ORDER.md)** - Complete migration guide with detailed instructions

## 🔧 Utility Scripts

### schema.sql

**Reference schema - DO NOT run directly**

Complete database schema for reference purposes. Shows the final state of all tables, indexes, functions, and RLS policies. Use migrations instead of running this file.

### verify_complete_schema.sql

Comprehensive schema verification script. Run this to check:

- All tables exist
- All columns are present
- RLS is enabled
- Policies are created
- Indexes are in place
- Foreign keys are set up

### RESET_AND_SETUP.sql

**⚠️ DEVELOPMENT ONLY - DELETES ALL DATA**

Completely drops and recreates all tables with the correct schema. Use this for:

- Development environment resets
- Testing fresh installations
- Fixing broken schemas

**Never use in production!**

## 🔄 Migration Workflow

1. **Verify current state**: Run `verify_complete_schema.sql`
2. **Apply migrations**: Use `supabase db push` or apply manually in order
3. **Verify again**: Run `verify_complete_schema.sql` to confirm
4. **Test app**: Ensure all API routes work correctly

## ⚠️ Important Notes

- Migrations are idempotent (safe to run multiple times)
- Always backup production data before applying migrations
- Test migrations in development first
- The initial schema migration creates all base tables
- Later migrations add columns or modify existing structures

## 🆘 Troubleshooting

### Missing tables?

Run the initial schema migration: `20260100000000_create_initial_schema.sql`

### Missing settings table?

Run the settings migration: `20260112132149_create_settings_table.sql`

### RLS errors?

Verify RLS is enabled: Check output of `verify_complete_schema.sql`

### Need fresh start?

Run `RESET_AND_SETUP.sql` (⚠️ development only, deletes all data)

## 📞 Support

See [MIGRATION_ORDER.md](MIGRATION_ORDER.md) for detailed instructions and troubleshooting steps.
