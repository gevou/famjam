-- Allow authenticated users to create a family (needed during onboarding)
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to create their first player (parent) record
-- This is needed during onboarding when no player record exists yet
CREATE POLICY "Authenticated users can create first player" ON players
  FOR INSERT WITH CHECK (
    -- Either: user is creating their own parent record (onboarding)
    (google_id = (SELECT auth.uid()::text) AND is_parent = true)
    OR
    -- Or: user is a parent adding a kid to their family
    family_id IN (
      SELECT family_id FROM players
      WHERE google_id = (SELECT auth.uid()::text) AND is_parent = true
    )
  );
