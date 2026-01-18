# Archived Migrations

This folder contains the original migration files that have been **consolidated** into the new numbered migrations (`0001`, `0002`, `0003`).

## Archive Date

2026-01-17

## Files Archived

These files represent the historical migration accumulation before consolidation:

1. **`20260100000000_create_initial_schema.sql`** (Archived)
   - Original migration that created chats, messages, and checkpoints tables
   - Content has been reviewed and consolidated into:
     - `0001_initial_schema.sql` (table creation)
     - `0002_security_and_triggers.sql` (RLS policies)

2. **`20260112132149_create_settings_table.sql`** (Archived)
   - Original migration that added the settings table with trigger
   - Content has been reviewed and consolidated into:
     - `0001_initial_schema.sql` (settings table creation)
     - `0002_security_and_triggers.sql` (trigger function and RLS policies)

3. **`20260115220000_add_delete_user_function.sql`** (Archived)
   - Original migration that added delete_own_account() function
   - Content has been reviewed and consolidated into:
     - `0003_app_logic.sql` (function with proper security)

## Why Archived?

The original migrations contained:

- Redundant/duplicate RLS enable statements
- Inconsistent formatting
- Scattered related functionality across multiple files

The consolidation provides:

- Clean, linear history
- Logical grouping (schema → security → app logic)
- Better documentation
- Elimination of redundancy
- All security best practices applied consistently

## Do Not Use

**These archived files should NOT be used for new deployments.**

For fresh database setup, use the consolidated migrations:

- `0001_initial_schema.sql`
- `0002_security_and_triggers.sql`
- `0003_app_logic.sql`

## Preserved for Reference

These files are kept for:

- Historical reference
- Audit trail of schema evolution
- Debugging existing databases that may have used these migrations
