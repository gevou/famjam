-- Allow family members to delete room_players entries (leave rooms)
CREATE POLICY "Family can leave rooms" ON room_players
  FOR DELETE USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN players p ON p.family_id = r.family_id
      WHERE p.google_id = (SELECT auth.uid()::text)
    )
  );
