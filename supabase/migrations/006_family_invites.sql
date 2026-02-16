-- Family invites: pending email-based invitations
CREATE TABLE family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES players(id),
  is_parent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, invited_email)
);

CREATE INDEX idx_family_invites_email ON family_invites(invited_email);

-- RLS: parents can manage invites for their family
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view family invites" ON family_invites
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM players
      WHERE google_id = (SELECT auth.uid()::text) AND is_parent = true
    )
  );

CREATE POLICY "Parents can create family invites" ON family_invites
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM players
      WHERE google_id = (SELECT auth.uid()::text) AND is_parent = true
    )
  );

CREATE POLICY "Parents can delete family invites" ON family_invites
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM players
      WHERE google_id = (SELECT auth.uid()::text) AND is_parent = true
    )
  );

-- RPC: Accept pending invites on login
-- Looks up invites by email, creates player records, deletes accepted invites
CREATE OR REPLACE FUNCTION accept_pending_invites(
  p_google_id TEXT,
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_family_id UUID;
  v_character_id UUID;
BEGIN
  -- Find the first pending invite for this email
  SELECT * INTO v_invite
  FROM family_invites
  WHERE invited_email = p_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_family_id := v_invite.family_id;

  -- Pick a random character not already used by this family
  SELECT c.id INTO v_character_id
  FROM characters c
  WHERE c.id NOT IN (
    SELECT character_id FROM players WHERE family_id = v_family_id AND character_id IS NOT NULL
  )
  ORDER BY random()
  LIMIT 1;

  -- Create the player record
  INSERT INTO players (family_id, display_name, character_id, is_parent, google_id)
  VALUES (
    v_family_id,
    split_part(p_email, '@', 1),  -- use email prefix as default display name
    v_character_id,
    v_invite.is_parent,
    p_google_id
  );

  -- Delete all invites for this email (could span multiple families, but we join first one)
  DELETE FROM family_invites WHERE invited_email = p_email;

  RETURN v_family_id;
END;
$$;
