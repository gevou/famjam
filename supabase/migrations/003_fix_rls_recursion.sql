-- Helper function to get the current user's family_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM players WHERE google_id = auth.uid()::text LIMIT 1;
$$;

-- Drop the problematic self-referencing policies
DROP POLICY IF EXISTS "Players can view own family" ON families;
DROP POLICY IF EXISTS "Players can view family members" ON players;
DROP POLICY IF EXISTS "Parents can manage family members" ON players;
DROP POLICY IF EXISTS "Authenticated users can create first player" ON players;
DROP POLICY IF EXISTS "Family members can view rooms" ON rooms;
DROP POLICY IF EXISTS "Family members can create rooms" ON rooms;
DROP POLICY IF EXISTS "Family members can update rooms" ON rooms;
DROP POLICY IF EXISTS "Family can view room players" ON room_players;
DROP POLICY IF EXISTS "Family can join rooms" ON room_players;
DROP POLICY IF EXISTS "Family can view game state" ON game_states;
DROP POLICY IF EXISTS "Family can view moves" ON moves;
DROP POLICY IF EXISTS "Family can insert moves" ON moves;

-- Recreate policies using the helper function (no recursion)
CREATE POLICY "Players can view own family" ON families
  FOR SELECT USING (id = get_my_family_id());

CREATE POLICY "Players can view family members" ON players
  FOR SELECT USING (family_id = get_my_family_id());

-- Parent onboarding: create first player record (no family exists yet)
CREATE POLICY "Users can create own parent record" ON players
  FOR INSERT WITH CHECK (
    google_id = auth.uid()::text AND is_parent = true
  );

-- Parents can add kids to their family
CREATE POLICY "Parents can add family members" ON players
  FOR INSERT WITH CHECK (
    family_id = get_my_family_id()
  );

-- Parents can update family members
CREATE POLICY "Parents can update family members" ON players
  FOR UPDATE USING (family_id = get_my_family_id());

-- Room policies using helper
CREATE POLICY "Family members can view rooms" ON rooms
  FOR SELECT USING (family_id = get_my_family_id());

CREATE POLICY "Family members can create rooms" ON rooms
  FOR INSERT WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update rooms" ON rooms
  FOR UPDATE USING (family_id = get_my_family_id());

-- Room players using helper
CREATE POLICY "Family can view room players" ON room_players
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Family can join rooms" ON room_players
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM rooms WHERE family_id = get_my_family_id())
  );

-- Game state and moves using helper
CREATE POLICY "Family can view game state" ON game_states
  FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Family can view moves" ON moves
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Family can insert moves" ON moves
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM rooms WHERE family_id = get_my_family_id())
  );
