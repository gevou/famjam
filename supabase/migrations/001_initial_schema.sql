-- Characters (predefined avatars)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL
);

-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Players (family members)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  character_id UUID REFERENCES characters(id),
  is_parent BOOLEAN NOT NULL DEFAULT false,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_players_family ON players(family_id);
CREATE INDEX idx_players_google ON players(google_id);

-- Game rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rooms_family_status ON rooms(family_id, status);

-- Players in a room
CREATE TABLE room_players (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  seat_number INTEGER NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, player_id)
);

-- Game state (one per room, updated in place)
CREATE TABLE game_states (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}',
  current_turn_player_id UUID REFERENCES players(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Move history
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  move_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_moves_room ON moves(room_id, created_at);

-- Seed characters
INSERT INTO characters (name, image_url) VALUES
  ('Bear', '/characters/bear.svg'),
  ('Cat', '/characters/cat.svg'),
  ('Dog', '/characters/dog.svg'),
  ('Fox', '/characters/fox.svg'),
  ('Owl', '/characters/owl.svg'),
  ('Penguin', '/characters/penguin.svg'),
  ('Rabbit', '/characters/rabbit.svg'),
  ('Tiger', '/characters/tiger.svg');

-- Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Characters are readable by everyone
CREATE POLICY "Characters are viewable by all" ON characters FOR SELECT USING (true);

-- Players can read their own family's data
CREATE POLICY "Players can view own family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

CREATE POLICY "Players can view family members" ON players
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

-- Parents can insert/update players in their family
CREATE POLICY "Parents can manage family members" ON players
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM players
      WHERE google_id = (SELECT auth.uid()::text) AND is_parent = true
    )
  );

-- Room policies: family members can view/create rooms
CREATE POLICY "Family members can view rooms" ON rooms
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

CREATE POLICY "Family members can create rooms" ON rooms
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

CREATE POLICY "Family members can update rooms" ON rooms
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

-- Room players: family members can view/join
CREATE POLICY "Family can view room players" ON room_players
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "Family can join rooms" ON room_players
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );

-- Game state and moves: family access
CREATE POLICY "Family can view game state" ON game_states
  FOR ALL USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "Family can view moves" ON moves
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "Family can insert moves" ON moves
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );
