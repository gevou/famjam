-- Clear all room_players entries
DELETE FROM room_players;

-- Mark all active rooms as finished
UPDATE rooms SET status = 'finished' WHERE status IN ('waiting', 'playing');
