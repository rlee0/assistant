-- Enable Row Level Security on the tools table
-- This resolves the warning: "Table public.tools has RLS policies but RLS is not enabled"

-- Enable RLS on the tools table
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Verify the policy exists or recreate it
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view tools" ON public.tools;

-- Create policy for authenticated users to view tools
CREATE POLICY "Authenticated users can view tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (true);

-- Optional: Add additional policies as needed
-- For example, if you want users to insert/update/delete tools:
-- CREATE POLICY "Authenticated users can insert tools"
--   ON public.tools FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can update tools"
--   ON public.tools FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can delete tools"
--   ON public.tools FOR DELETE
--   TO authenticated
--   USING (true);
