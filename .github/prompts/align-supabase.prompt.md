# Supabase Folder Cleanup Prompt

Run this prompt to clean up the supabase folder for a fresh implementation:

---

**Task: Clean up the supabase folder to contain only files and documentation needed for a clean, fresh set of migrations based on the current state and structure of the app.**

## Requirements:

1. **Analyze the current application structure:**

   - Review TypeScript types in `src/features/*/types.ts`
   - Check API routes in `src/app/api/**` to understand database operations
   - Identify all database tables, columns, and relationships currently in use

2. **Create minimal, consolidated migrations:**

   - Consolidate redundant migrations into single files
   - Each migration should be complete and not require follow-up patches
   - Remove any "fix" or "update" migrations that could be incorporated into earlier ones
   - Ensure all functions have proper security (`SECURITY DEFINER`, `SET search_path = public`)
   - Use idempotent SQL where possible (IF NOT EXISTS, etc.)

3. **Required migrations (consolidate as needed):**

   - Initial schema (chats, messages, checkpoints tables)
   - Settings table (complete with all columns, RLS, and triggers)
   - Additional columns (model, context for chats)
   - Database functions (delete_own_account, update_settings_updated_at)

4. **Update all documentation:**

   - `README.md` - Overview, structure, quick start
   - `MIGRATION_ORDER.md` - Detailed migration guide
   - `schema.sql` - Complete reference schema (not for execution)
   - `verify_complete_schema.sql` - Comprehensive verification script
   - `RESET_AND_SETUP.sql` - Development reset script

5. **Ensure consistency:**

   - All functions must have `SET search_path = public`
   - All foreign keys must have `ON DELETE CASCADE`
   - All tables must have RLS enabled with proper policies
   - All timestamps must use TIMESTAMPTZ
   - All IDs must use UUID

6. **Remove:**

   - Temporary files (keep `.temp/` folder if it exists, it's Supabase CLI metadata)
   - Redundant migrations
   - Outdated documentation
   - Any reference to deprecated approaches (like service role keys)

7. **Final validation:**
   - Migration order is clear and logical
   - Each migration can run independently on a fresh database
   - Documentation accurately reflects the migration files
   - `verify_complete_schema.sql` checks all tables, columns, functions, and security settings

## Expected Result:

A clean `supabase/` folder with:

- 3-5 consolidated migration files
- Complete, accurate documentation
- No redundant or patch files
- Ready for fresh database deployments

---

**Execute this cleanup and provide a summary of:**

1. Files removed
2. Migrations consolidated
3. Final migration list
4. Any breaking changes or considerations
