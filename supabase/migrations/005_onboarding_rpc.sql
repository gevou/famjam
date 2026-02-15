-- Onboarding RPC: creates family + parent player in one atomic call
-- Uses SECURITY DEFINER to bypass RLS for bootstrapping
CREATE OR REPLACE FUNCTION create_family_with_parent(
  p_display_name TEXT,
  p_character_id UUID,
  p_google_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Create the family
  INSERT INTO families DEFAULT VALUES RETURNING id INTO v_family_id;

  -- Create the parent player
  INSERT INTO players (family_id, display_name, character_id, is_parent, google_id)
  VALUES (v_family_id, p_display_name, p_character_id, true, p_google_id);

  RETURN v_family_id;
END;
$$;
