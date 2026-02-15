# FamJam — Family Turn-Based Games with Live Video Chat

## Overview

A web-based family game platform where 2-4 players play simple turn-based games while video chatting in real time. Designed for a family with young children (ages 6 and 8.5, Greek native speakers learning English). Web-first, with native apps planned for later.

## Users

- **Parent(s)**: Sign in with Google. Create and manage family player profiles.
- **Kids**: Tap their avatar from the family screen to join. No accounts or passwords needed.
- A parent can link a second Google account (e.g., spouse) to the same family.
- Multi-device: same player can be logged in on multiple devices. Only one device active in a game room at a time.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (React) | Fast iteration, SSR for lobby, large ecosystem |
| Video/Audio | LiveKit Cloud | Open-source, Safari 11+ support, React SDK, manual track subscription for low-end devices. Self-hostable later |
| Auth | Supabase Auth (Google OAuth) | Built-in Google sign-in, session management |
| Database | Supabase (Postgres + Realtime) | Profiles, game state, lobby. Realtime subscriptions for live updates |
| Game State Sync | Supabase Realtime (broadcast/presence) | Turn-based moves broadcast per room. Presence for online status |
| Hosting | Vercel | Natural fit for Next.js |

## Core Screens

### 1. Login
- Google sign-in for parent(s).
- First login creates a family + prompts to create player profiles.

### 2. Family Home / Player Select
- Grid of family member avatars/characters.
- Tap an avatar to enter as that player.
- Parent can add/edit/remove profiles from here.
- Shows who's currently online (green dot).

### 3. Lobby
- "Start a Game" button — pick a game type, create a room.
- Active rooms shown with join button (or notification: "Mom started Tic-Tac-Toe — Join?").
- Simple room codes for sharing outside the family if needed later.

### 4. Game Room
- **Top area**: Video chat (grid on modern devices, spotlight on active player for low-end devices).
- **Bottom/center area**: Game board.
- **Controls**: Mute mic, mute all, camera on/off.
- **Turn indicator**: Whose turn it is, highlighted in both the game and video area.

## Data Model

### players
- id, family_id, display_name, character_id, is_parent, google_id (nullable, only for parents), created_at

### families
- id, created_at

### characters (predefined set)
- id, name, image_url

### rooms
- id, family_id, game_type, max_players, status (waiting | playing | finished), created_by, created_at

### room_players
- room_id, player_id, seat_number, joined_at, is_active_device

### game_states
- room_id, state_json, current_turn_player_id, updated_at

### moves
- id, room_id, player_id, move_json, created_at

## Game Engine Interface

Each game implements:

```typescript
interface Game {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  initialState(players: Player[]): GameState;
  validateMove(state: GameState, playerId: string, move: Move): boolean;
  applyMove(state: GameState, playerId: string, move: Move): GameState;
  getStatus(state: GameState): { finished: boolean; winner?: string; scores?: Record<string, number> };
}
```

### Game 1: Tic-Tac-Toe
- 2 players, 3x3 grid.
- State: `{ board: (null | "X" | "O")[9], players: { X: playerId, O: playerId } }`
- Move: `{ position: 0-8 }`

### Game 2: S.O.S.
- 2-4 players, configurable grid (default 5x5).
- Two variants: "simple" (first SOS wins) and "general" (most SOS sequences when board full wins).
- State: `{ board: (null | "S" | "O")[], size: number, variant: "simple" | "general", scores: Record<playerId, number> }`
- Move: `{ position: number, letter: "S" | "O" }`
- Scoring: when a player completes "SOS" (horizontal, vertical, diagonal) through their placed cell, they score +1 and get another turn.

## Video Chat Design

### Standard Mode (modern devices)
- 2x2 grid layout for all participants' video.
- Active player's video has a highlighted border (matches their game color/character).

### Lite Mode (iPad Mini 2 / low-end devices)
- Only the active player's video is displayed (spotlight mode).
- Audio from all participants remains active.
- LiveKit manual track subscription: subscribe to active player's video track only, switch on turn change.
- Detection: `navigator.deviceMemory < 2` or user toggles "Lite mode" in settings.

### Audio Controls
- **Mute mic** toggle per player (always visible, prominent).
- **Mute all audio** quick button (for when players are in the same physical room).
- **Camera on/off** toggle.

## Game Backlog (Future)

Ordered by recommended build sequence:

| Priority | Game | Players | Educational Value |
|----------|------|---------|------------------|
| 3 | Memory Match | 2-4 | English vocabulary (picture + word pairs) |
| 4 | Picture Quiz | 2-4 | English vocabulary (identify pictures) |
| 5 | Hangman | 2-4 | English spelling |
| 6 | Math Battle | 2-4 | Arithmetic (race to answer) |
| 7 | Word Scramble | 2-4 | English spelling |
| 8 | Connect Four | 2 | Strategy |
| 9 | UNO-like | 2-4 | Numbers, colors (in English) |
| 10 | Pictionary | 2-4 | English vocabulary + drawing |
| 11 | Monopoly-lite | 2-4 | Math (money), English property names |

## Key Design Decisions

1. **Family account model** over individual accounts — kids under 8 can't manage logins.
2. **No public matchmaking** — family-only for now. Simplifies everything (no moderation, no strangers).
3. **Adaptive video** — spotlight mode for low-end devices keeps the iPad Mini 2 in play.
4. **Game engine as interface** — adding new games is plug-and-play; implement the interface and register it.
5. **Supabase Realtime over custom WebSocket server** — no backend to manage for turn-based sync.
6. **Mute controls prominent** — essential when some players share a physical room.
