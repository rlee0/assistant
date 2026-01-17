# Role

You are a Lead Database Architect specializing in Supabase and PostgreSQL.

# Context

We are resetting the database schema for a **fresh implementation**. The current `supabase/migrations` folder contains accumulated technical debt (redundant patches, fixes). We need to consolidate these into a clean, linear history based on the _actual_ application code usage.

# Task

Refactor the `supabase/` directory to support a clean deployment.

## Phase 1: Schema Audit

Before writing SQL, analyze the codebase to determine the _required_ schema:

1.  **Types:** Scan `src/features/*/types.ts` to derive table structures.
2.  **Logic:** Scan `src/app/api/**` to identify necessary RLS policies and stored procedures.
3.  **Current State:** Read the existing `supabase/migrations` to ensure no hidden constraints or triggers are lost.

## Phase 2: Execution (Consolidation)

Create a new set of consolidated migration files (numbered `0001`, `0002`, etc.) that replace the existing history.

1.  **0001_initial_schema.sql:** Core tables (chats, messages, checkpoints), enums, and basic RLS.
2.  **0002_security_and_triggers.sql:** Advanced RLS policies, triggers (e.g., `updated_at`), and functions.
3.  **0003_app_logic.sql:** Application-specific logic (e.g., `delete_own_account`, settings management).

## Phase 3: Documentation & Verification

Generate/Update the following:

- `supabase/schema.sql`: A pure reference dump of the final intended schema (do not use for execution).
- `supabase/verify_complete_schema.sql`: A SQL script that queries `information_schema` to validate that all expected tables and columns exist.
- `supabase/MIGRATION_ORDER.md`: A strict ordering guide.

## Strict Technical Constraints

- **Security:** ALL functions must include `SET search_path = public` to prevent search_path hijacking.
- **Idempotency:** Use `CREATE OR REPLACE` for functions and `IF NOT EXISTS` for tables/indexes.
- **Timestamps:** All time columns must use `TIMESTAMPTZ` (not just TIMESTAMP).
- **Keys:** All Primary Keys must be `UUID` (gen_random_uuid()).
- **Foreign Keys:** Must include `ON DELETE CASCADE` where appropriate to prevent orphaned records.

## Cleanup Instructions

Once the new consolidated migrations are created and verified:

1.  Move old migrations to a `supabase/migrations/_archive` folder (do not delete immediately).
2.  Remove any temporary files _except_ `.temp/` (Supabase CLI metadata).

# Output Requirement

After execution, provide a summary listing:

1.  The mapping of old migrations -> new consolidated files.
2.  A list of "Dead Code" (tables/columns found in old migrations but not in the app code) that you excluded.
