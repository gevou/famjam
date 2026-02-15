-- Ensure the families INSERT policy exists
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
