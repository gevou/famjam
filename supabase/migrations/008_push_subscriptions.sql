CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX idx_push_subscriptions_player ON push_subscriptions(player_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Players can manage their own push subscriptions
CREATE POLICY "Players can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (
    player_id IN (SELECT id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

CREATE POLICY "Players can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (
    player_id IN (SELECT id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );

CREATE POLICY "Players can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (
    player_id IN (SELECT id FROM players WHERE google_id = (SELECT auth.uid()::text))
  );
