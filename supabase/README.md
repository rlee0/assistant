# Supabase Database

This directory contains all database migrations and utility scripts for the AI Assistant application.

## 📁 Structure

```
supabase/
├── migrations/              # Database migrations (apply in order)
│   ├── 20260100000000_create_initial_schema.sql
│   ├── 20260112132149_create_settings_table.sql
│   ├── 20260112140000_add_data_column_to_settings.sql
│   ├── 20260112141500_update_settings_schema.sql
│   └── 20260115080000_add_missing_chat_columns.sql
├── verify_complete_schema.sql    # Verify database schema
├── RESET_AND_SETUP.sql           # Development reset (⚠️ deletes data)
├── MIGRATION_ORDER.md            # Detailed migration guide
└── SCHEMA_REVIEW_SUMMARY.md     # Schema review and alignment report

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

- **chats** - Conversation sessions
  - Columns: id, user_id, title, model, context, is_pinned, created_at, updated_at
- **messages** - Chat messages
  - Columns: id, chat_id, user_id, role, content, created_at
- **checkpoints** - Conversation restore points
  - Columns: id, chat_id, user_id, message_index, timestamp, created_at
- **settings** - User preferences
  - Columns: id, user_id, data, created_at, updated_at

### Security

- ✓ Row Level Security (RLS) enabled on all tables
- ✓ User isolation enforced (users only see their own data)
- ✓ Cascade deletes when user account is removed

### Performance

- ✓ Indexes on all foreign keys
- ✓ Composite indexes for common queries
- ✓ Optimized for user-scoped queries

## 📖 Documentation

- **[MIGRATION_ORDER.md](MIGRATION_ORDER.md)** - Complete migration guide with detailed instructions
- **[SCHEMA_REVIEW_SUMMARY.md](SCHEMA_REVIEW_SUMMARY.md)** - Schema review report and alignment with app

## 🔧 Utility Scripts

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

### Missing columns?

Run the missing columns migration: `20260115080000_add_missing_chat_columns.sql`

### RLS errors?

Verify RLS is enabled: Check output of `verify_complete_schema.sql`

### Need fresh start?

Run `RESET_AND_SETUP.sql` (⚠️ development only, deletes all data)

## 📞 Support

See [MIGRATION_ORDER.md](MIGRATION_ORDER.md) for detailed instructions and troubleshooting steps.
