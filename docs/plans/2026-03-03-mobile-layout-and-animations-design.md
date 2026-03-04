# Design: Mobile-First Game Room Layout + Win/Lose Animations

**Date:** 2026-03-03
**Epics:** famjam-eja (Mobile layout), famjam-hbg (Animations)

## Epic 1: Mobile-First Game Room Layout

### Problem
The game room is a vertical scroll layout that overflows on mobile/iPad. Video feeds sit above the game board, pushing it below the fold.

### Design

**Viewport-locked layout** using `h-dvh overflow-hidden`:

```
┌──────────────────────────────┐
│  [← Leave]  Game Name  [👤] │  ← fixed top overlay (~40px, semi-transparent)
├──────────────────────────────┤
│                              │
│         GAME BOARD           │  ← centered, fills remaining space
│       (+ action overlays)    │
│                              │
├──────────────────────────────┤
│  📹   📹   📹   📹          │  ← video strip (~20vh, square feeds)
│  Mic  Mic  Mic  Mic          │
└──────────────────────────────┘
```

### Key decisions

1. **Root container:** `h-dvh` (dynamic viewport height, handles mobile browser chrome) with `overflow-hidden`. Three-row CSS grid: `auto 1fr auto`.

2. **Top bar:** Absolute overlay with `bg-black/40 backdrop-blur`. Contains Leave button, game name, player banner. Doesn't affect layout flow.

3. **Game board area:** Center cell of grid. Game boards already have `max-w-md aspect-square` — add `max-h-[calc(100%-env(safe-area))]` sizing. Action buttons (roll, buy, upgrade) overlay at bottom of this area.

4. **Video strip:** Bottom row. Horizontal flex of square video feeds. Each feed is `aspect-square` with `object-fit: contain` (fit) or `object-fit: cover` (crop).

5. **Video fit/crop toggle:** Global toggle button on the video strip. Stores preference in localStorage. Default: crop (center of frame, fills square).

6. **Square video feeds:** Wrap LiveKit `VideoTrack` in a square container. Player name overlay at bottom of each feed. Active turn indicator (yellow ring). Speaking indicator (green ring).

### Files to modify
- `src/app/room/[roomId]/page.tsx` — viewport-locked grid layout, move nav to overlay
- `src/components/video-chat.tsx` — square feeds, fit/crop toggle, bottom strip layout
- `src/components/player-banner.tsx` — adapt for overlay positioning

---

## Epic 2: Win/Lose Animation Splash Screens

### Problem
Game end is abrupt — just text saying "You win!" or "You lost!". No celebration or fun moment.

### Design

**New component:** `src/components/games/game-end-splash.tsx`

Renders as a full-screen overlay (`fixed inset-0 z-50`) when the game finishes. Plays for ~3 seconds, then fades to reveal scores and Play Again button.

### Winner animations (3 variations)

1. **Confetti Burst** — CSS-animated colored squares/circles falling from top, randomized positions and delays
2. **Fireworks** — Radial burst animations at random positions, multiple colors, scale+fade keyframes
3. **Trophy Drop** — Large trophy emoji drops from top with bounce, golden glow pulse radiates outward

All show "YOU WIN!" text with scale-in animation.

### Loser animations (3 variations)

1. **Rain Cloud** — Cloud emoji at top with CSS raindrop particles falling, gentle blue tint
2. **Wobbly Shrink** — Screen content does a playful wobble + slight shrink, "Good game!" message fades in
3. **Spotlight Fade** — Everything dims except a spotlight circle, "Better luck next time!" with gentle fade

All are playful/funny, not mean — designed for kids ages 6-8.

### Video feed effects

- **Winner:** Golden glowing border (box-shadow pulse), crown emoji overlay at top of feed
- **Losers:** Subtle blue/gray tint overlay (semi-transparent div)

### Animation selection

- Random variation picked on game end: `Math.floor(Math.random() * 3)`
- Same variation index used for both winner and loser animations (they're paired)
- Animation state managed in game room page, not in game engine

### Flow
1. `gameStatus.finished` becomes true
2. Game room sets `showSplash = true`, picks random variant
3. `GameEndSplash` renders overlay for 3 seconds
4. After timeout, `showSplash = false`, scores + Play Again revealed
5. Video feed effects persist until Play Again is clicked

### Files to create/modify
- `src/components/games/game-end-splash.tsx` (new) — splash overlay component
- `src/app/room/[roomId]/page.tsx` (modify) — splash state, video feed effects
- `src/components/video-chat.tsx` (modify) — accept winner/loser props for feed effects

---

## Testing Strategy

### Unit tests
- Animation variant picker (deterministic with seeded random)
- Winner/loser classification from game status
- Video fit/crop mode toggle logic

### Component tests (vitest + React Testing Library)
- `GameEndSplash` renders winner variant with correct text
- `GameEndSplash` renders loser variant with correct text
- Video feed renders with square aspect ratio
- Video feed applies crop/fit class correctly
- Top bar renders as overlay (position check)

### Integration tests
- Game room: viewport is locked (no overflow)
- Game room: splash shows on game end, hides after timeout
- Game room: video feeds show at bottom
- Game room: video feed effects apply to winner/loser feeds
