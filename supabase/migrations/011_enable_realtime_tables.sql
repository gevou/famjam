-- Add rooms and room_players to the realtime publication
-- so postgres_changes listeners in the lobby receive updates
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
