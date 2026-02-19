-- Clean up stale room_players: remove entries where a player appears in multiple active rooms.
-- Keep only the most recent room (by room created_at) for each player.
DELETE FROM room_players
WHERE ctid IN (
  SELECT rp.ctid
  FROM room_players rp
  JOIN rooms r ON r.id = rp.room_id
  WHERE r.status IN ('waiting', 'playing')
    AND (rp.player_id, r.created_at) NOT IN (
      SELECT rp2.player_id, MAX(r2.created_at)
      FROM room_players rp2
      JOIN rooms r2 ON r2.id = rp2.room_id
      WHERE r2.status IN ('waiting', 'playing')
      GROUP BY rp2.player_id
    )
);

-- Mark rooms with no remaining players as finished
UPDATE rooms
SET status = 'finished'
WHERE status IN ('waiting', 'playing')
  AND id NOT IN (SELECT DISTINCT room_id FROM room_players);
