# Mobile-First Layout + Win/Lose Animations — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the game room viewport-locked on mobile/iPad with video feeds at the bottom, and add fun animated splash screens for game end.

**Architecture:** The game room page becomes a 3-row CSS grid (nav overlay / game board / video strip) locked to `100dvh`. A new `GameEndSplash` component renders celebration/consolation overlays with CSS animations. Video feeds become square with fit/crop toggle.

**Tech Stack:** React, Tailwind CSS, CSS keyframe animations, vitest + React Testing Library

---

## Task 1: Game End Splash — Animation Utilities

**Files:**
- Create: `src/lib/animations.ts`
- Create: `src/lib/animations.test.ts`

**Step 1: Write the failing tests**

```ts
// src/lib/animations.test.ts
import { describe, it, expect, vi } from 'vitest'
import { pickVariant, classifyPlayers, WINNER_VARIANTS, LOSER_VARIANTS } from './animations'

describe('pickVariant', () => {
  it('returns a number between 0 and count-1', () => {
    for (let i = 0; i < 20; i++) {
      const v = pickVariant(3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(3)
    }
  })

  it('returns 0 when count is 1', () => {
    expect(pickVariant(1)).toBe(0)
  })
})

describe('classifyPlayers', () => {
  it('identifies winner and losers from game status', () => {
    const result = classifyPlayers(
      { finished: true, winner: 'alice', scores: { alice: 30, bob: 15, charlie: 20 } },
      ['alice', 'bob', 'charlie']
    )
    expect(result.winnerId).toBe('alice')
    expect(result.loserIds).toEqual(['bob', 'charlie'])
  })

  it('returns null winner for draws', () => {
    const result = classifyPlayers(
      { finished: true, scores: { alice: 15, bob: 15 } },
      ['alice', 'bob']
    )
    expect(result.winnerId).toBeNull()
    expect(result.loserIds).toEqual([])
  })

  it('returns null for unfinished games', () => {
    const result = classifyPlayers(
      { finished: false, scores: { alice: 10, bob: 10 } },
      ['alice', 'bob']
    )
    expect(result.winnerId).toBeNull()
    expect(result.loserIds).toEqual([])
  })
})

describe('variant arrays', () => {
  it('has exactly 3 winner variants', () => {
    expect(WINNER_VARIANTS).toHaveLength(3)
  })
  it('has exactly 3 loser variants', () => {
    expect(LOSER_VARIANTS).toHaveLength(3)
  })
  it('each variant has id and label', () => {
    for (const v of [...WINNER_VARIANTS, ...LOSER_VARIANTS]) {
      expect(v.id).toBeTruthy()
      expect(v.label).toBeTruthy()
    }
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/animations.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
// src/lib/animations.ts
import type { GameStatus } from './games/types'

export type VariantDef = { id: string; label: string }

export const WINNER_VARIANTS: VariantDef[] = [
  { id: 'confetti', label: 'Confetti Burst' },
  { id: 'fireworks', label: 'Fireworks' },
  { id: 'trophy', label: 'Trophy Drop' },
]

export const LOSER_VARIANTS: VariantDef[] = [
  { id: 'rain', label: 'Rain Cloud' },
  { id: 'wobble', label: 'Wobbly Shrink' },
  { id: 'spotlight', label: 'Spotlight Fade' },
]

export function pickVariant(count: number): number {
  return Math.floor(Math.random() * count)
}

export function classifyPlayers(
  status: GameStatus,
  playerOrder: string[]
): { winnerId: string | null; loserIds: string[] } {
  if (!status.finished || !status.winner) {
    return { winnerId: null, loserIds: [] }
  }
  return {
    winnerId: status.winner,
    loserIds: playerOrder.filter(pid => pid !== status.winner),
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/animations.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add src/lib/animations.ts src/lib/animations.test.ts
git commit -m "feat: animation utility functions with tests"
```

---

## Task 2: GameEndSplash Component — Winner Animations

**Files:**
- Create: `src/components/games/game-end-splash.tsx`
- Create: `src/components/games/game-end-splash.test.tsx`

**Step 1: Write the failing tests**

```tsx
// src/components/games/game-end-splash.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameEndSplash } from './game-end-splash'

describe('GameEndSplash', () => {
  const baseProps = {
    isWinner: true,
    variantIndex: 0,
    winnerName: 'Alice',
    onComplete: vi.fn(),
  }

  describe('winner animations', () => {
    it('renders confetti variant (index 0)', () => {
      render(<GameEndSplash {...baseProps} variantIndex={0} />)
      expect(screen.getByText(/you win/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-confetti')).toBeInTheDocument()
    })

    it('renders fireworks variant (index 1)', () => {
      render(<GameEndSplash {...baseProps} variantIndex={1} />)
      expect(screen.getByText(/you win/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-fireworks')).toBeInTheDocument()
    })

    it('renders trophy variant (index 2)', () => {
      render(<GameEndSplash {...baseProps} variantIndex={2} />)
      expect(screen.getByText(/you win/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-trophy')).toBeInTheDocument()
    })
  })

  describe('loser animations', () => {
    it('renders rain variant (index 0)', () => {
      render(<GameEndSplash {...baseProps} isWinner={false} variantIndex={0} />)
      expect(screen.getByText(/good game/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-rain')).toBeInTheDocument()
    })

    it('renders wobble variant (index 1)', () => {
      render(<GameEndSplash {...baseProps} isWinner={false} variantIndex={1} />)
      expect(screen.getByText(/good game/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-wobble')).toBeInTheDocument()
    })

    it('renders spotlight variant (index 2)', () => {
      render(<GameEndSplash {...baseProps} isWinner={false} variantIndex={2} />)
      expect(screen.getByText(/good game/i)).toBeInTheDocument()
      expect(screen.getByTestId('splash-spotlight')).toBeInTheDocument()
    })
  })

  it('calls onComplete after timeout', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<GameEndSplash {...baseProps} onComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3500)
    expect(onComplete).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/games/game-end-splash.test.tsx`
Expected: FAIL

**Step 3: Write the component**

Create `src/components/games/game-end-splash.tsx` with:
- Props: `isWinner`, `variantIndex`, `winnerName`, `onComplete`
- Fixed overlay (`fixed inset-0 z-50`)
- `useEffect` with 3500ms timeout to call `onComplete`
- Winner variants: confetti (CSS particle divs), fireworks (radial bursts), trophy (bounce-in emoji)
- Loser variants: rain (droplet particles), wobble (CSS wobble animation), spotlight (radial gradient mask)
- All animations are pure CSS keyframes via Tailwind `animate-` or inline `@keyframes` in style tags
- Each variant wrapper has `data-testid="splash-{id}"`

The component body should contain:
- A `<style>` tag defining the keyframe animations
- The variant-specific particle/effect elements
- A centered message: "YOU WIN!" or "Good game!"
- Fade-in animation on mount

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/games/game-end-splash.test.tsx`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add src/components/games/game-end-splash.tsx src/components/games/game-end-splash.test.tsx
git commit -m "feat: game end splash component with 6 animation variants"
```

---

## Task 3: Video Feed — Square Aspect Ratio + Fit/Crop Toggle

**Files:**
- Create: `src/components/video-chat.test.tsx`
- Modify: `src/components/video-chat.tsx`

**Step 1: Write the failing tests**

```tsx
// src/components/video-chat.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoFeed } from './video-chat'

// Mock LiveKit components
vi.mock('@livekit/components-react', () => ({
  VideoTrack: ({ className }: any) => <div data-testid="video-track" className={className} />,
  useTracks: () => [],
  useParticipants: () => [],
  useLocalParticipant: () => ({ localParticipant: { isMicrophoneEnabled: true, setMicrophoneEnabled: vi.fn() } }),
  LiveKitRoom: ({ children }: any) => <div>{children}</div>,
  AudioTrack: () => null,
  useRoomContext: () => ({}),
}))

vi.mock('@livekit/components-styles', () => ({}))

describe('VideoFeed', () => {
  const baseProps = {
    displayName: 'Alice',
    isConnected: true,
    isActive: false,
    isYou: false,
    avatarUrl: undefined,
    videoTrack: null,
    isSpeaking: false,
    micEnabled: true,
    cropMode: false,
    resultEffect: undefined as 'winner' | 'loser' | undefined,
  }

  it('renders with square aspect ratio', () => {
    const { container } = render(<VideoFeed {...baseProps} />)
    const feed = container.firstElementChild as HTMLElement
    expect(feed.className).toContain('aspect-square')
  })

  it('applies object-contain when cropMode is false (fit)', () => {
    render(<VideoFeed {...baseProps} videoTrack={{} as any} cropMode={false} />)
    const track = screen.getByTestId('video-track')
    expect(track.className).toContain('object-contain')
  })

  it('applies object-cover when cropMode is true (crop)', () => {
    render(<VideoFeed {...baseProps} videoTrack={{} as any} cropMode={true} />)
    const track = screen.getByTestId('video-track')
    expect(track.className).toContain('object-cover')
  })

  it('shows winner effect with golden glow', () => {
    const { container } = render(<VideoFeed {...baseProps} resultEffect="winner" />)
    const feed = container.firstElementChild as HTMLElement
    expect(feed.className).toContain('ring-yellow-400')
  })

  it('shows loser effect with blue tint', () => {
    render(<VideoFeed {...baseProps} resultEffect="loser" />)
    expect(screen.getByTestId('loser-tint')).toBeInTheDocument()
  })

  it('shows crown overlay for winner', () => {
    render(<VideoFeed {...baseProps} resultEffect="winner" />)
    expect(screen.getByTestId('winner-crown')).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/video-chat.test.tsx`
Expected: FAIL — VideoFeed not exported

**Step 3: Extract VideoFeed component and add fit/crop + result effects**

Modify `src/components/video-chat.tsx`:
- Extract the per-player video cell into an exported `VideoFeed` component
- Props: `displayName`, `isConnected`, `isActive`, `isYou`, `avatarUrl`, `videoTrack`, `isSpeaking`, `micEnabled`, `cropMode`, `resultEffect`
- Container: `aspect-square` (replaces `aspect-video`)
- Video element: `object-contain` when `cropMode=false`, `object-cover` when `cropMode=true`
- Winner effect: `ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]` + crown emoji overlay (`data-testid="winner-crown"`)
- Loser effect: semi-transparent blue overlay div (`data-testid="loser-tint"`)
- `VideoGrid` updated to use `VideoFeed` and pass `cropMode` + `resultEffect` props

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/video-chat.test.tsx`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add src/components/video-chat.tsx src/components/video-chat.test.tsx
git commit -m "feat: square video feeds with fit/crop and winner/loser effects"
```

---

## Task 4: Viewport-Locked Game Room Layout

**Files:**
- Create: `src/app/room/[roomId]/page.test.tsx`
- Modify: `src/app/room/[roomId]/page.tsx`

**Step 1: Write the failing tests**

```tsx
// src/app/room/[roomId]/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameRoomLayout } from './game-room-layout'

// We test the layout wrapper, not the full page (which needs hooks/routing)
describe('GameRoomLayout', () => {
  it('renders with viewport-locked height', () => {
    const { container } = render(
      <GameRoomLayout
        topBar={<div>nav</div>}
        gameBoard={<div>board</div>}
        videoStrip={<div>videos</div>}
      />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('h-dvh')
    expect(root.className).toContain('overflow-hidden')
  })

  it('renders three layout sections', () => {
    render(
      <GameRoomLayout
        topBar={<div data-testid="top">nav</div>}
        gameBoard={<div data-testid="board">board</div>}
        videoStrip={<div data-testid="video">videos</div>}
      />
    )
    expect(screen.getByTestId('top')).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.getByTestId('video')).toBeInTheDocument()
  })

  it('top bar is positioned as overlay', () => {
    render(
      <GameRoomLayout
        topBar={<div>nav</div>}
        gameBoard={<div>board</div>}
        videoStrip={<div>videos</div>}
      />
    )
    const topBar = screen.getByTestId('layout-top-bar')
    expect(topBar.className).toContain('absolute')
  })

  it('game board area is centered', () => {
    render(
      <GameRoomLayout
        topBar={<div>nav</div>}
        gameBoard={<div>board</div>}
        videoStrip={<div>videos</div>}
      />
    )
    const boardArea = screen.getByTestId('layout-board-area')
    expect(boardArea.className).toContain('items-center')
    expect(boardArea.className).toContain('justify-center')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/room/\\[roomId\\]/page.test.tsx`
Expected: FAIL

**Step 3: Create GameRoomLayout component and refactor page**

Create `src/app/room/[roomId]/game-room-layout.tsx`:
- Exported `GameRoomLayout` component with props: `topBar`, `gameBoard`, `videoStrip`, optional `splash`
- Root: `h-dvh overflow-hidden flex flex-col bg-gradient-to-b from-indigo-500 to-purple-600`
- Top bar wrapper: `absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm` with `data-testid="layout-top-bar"`
- Board area: `flex-1 flex items-center justify-center overflow-hidden p-2 pt-12` with `data-testid="layout-board-area"`
- Video strip: `shrink-0` at bottom
- Splash slot: renders above everything when present

Modify `src/app/room/[roomId]/page.tsx`:
- Use `GameRoomLayout` as the wrapper
- Move Leave button / game name / player banner into `topBar` slot
- Game board + action buttons go into `gameBoard` slot
- `VideoChat` goes into `videoStrip` slot
- Add splash state management for game end

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/room/\\[roomId\\]/page.test.tsx`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add "src/app/room/[roomId]/game-room-layout.tsx" "src/app/room/[roomId]/page.test.tsx" "src/app/room/[roomId]/page.tsx"
git commit -m "feat: viewport-locked game room layout with overlay nav"
```

---

## Task 5: Wire Video Strip Layout + Crop Toggle

**Files:**
- Modify: `src/components/video-chat.tsx`
- Modify: `src/components/video-chat.test.tsx`

**Step 1: Add tests for crop toggle and strip layout**

Add to `src/components/video-chat.test.tsx`:

```tsx
describe('CropToggle', () => {
  it('renders toggle button', () => {
    render(<CropToggle cropMode={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /fit/i })).toBeInTheDocument()
  })

  it('shows "Crop" label when in fit mode', () => {
    render(<CropToggle cropMode={false} onToggle={vi.fn()} />)
    expect(screen.getByText(/crop/i)).toBeInTheDocument()
  })

  it('shows "Fit" label when in crop mode', () => {
    render(<CropToggle cropMode={true} onToggle={vi.fn()} />)
    expect(screen.getByText(/fit/i)).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<CropToggle cropMode={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
```

**Step 2: Run to verify fail**

Run: `npx vitest run src/components/video-chat.test.tsx`
Expected: FAIL — CropToggle not exported

**Step 3: Implement CropToggle and update VideoGrid layout**

- Export `CropToggle` component: small button that toggles fit/crop
- Update `VideoGrid` to render feeds in a horizontal flex strip: `flex gap-2 overflow-x-auto px-2 py-1`
- Each `VideoFeed` is `w-[20vh] shrink-0` (square, sized relative to viewport height)
- Add `cropMode` state in `VideoChat`, read/write from `localStorage` key `famjam-video-crop`
- Pass `cropMode` to each `VideoFeed`
- Render `CropToggle` next to `RoomControls`

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/video-chat.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/video-chat.tsx src/components/video-chat.test.tsx
git commit -m "feat: video strip layout with crop/fit toggle"
```

---

## Task 6: Wire Game End Splash Into Game Room

**Files:**
- Modify: `src/app/room/[roomId]/page.tsx`
- Modify: `src/components/video-chat.tsx` (pass resultEffect props)

**Step 1: Integration — add splash state to game room**

In `page.tsx`:
- Add state: `showSplash`, `splashVariant` (number)
- When `gameStatus?.finished` becomes true AND `showSplash` hasn't been shown yet, set `showSplash = true` and `splashVariant = pickVariant(3)`
- Render `GameEndSplash` in the `splash` slot of `GameRoomLayout`
- Pass `onComplete` to set `showSplash = false`
- Pass `winnerId` and `resultEffect` map to `VideoChat` so feeds show winner/loser effects
- "Play Again" button only shows after splash completes

**Step 2: Update VideoChat to accept result effects**

Add optional prop `playerEffects: Record<string, 'winner' | 'loser'>` to `VideoChat`.
Pass through to `VideoGrid`, which passes to each `VideoFeed`.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Build check**

Run: `npx next build`
Expected: Clean build

**Step 5: Commit**

```bash
git add "src/app/room/[roomId]/page.tsx" src/components/video-chat.tsx
git commit -m "feat: wire game end splash and video feed effects into game room"
```

---

## Task 7: Final Polish + Full Test Run

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (55 existing + ~17 new)

**Step 2: Build**

Run: `npx next build`
Expected: Clean

**Step 3: Manual check list**
- [ ] Game room fills viewport, no scroll
- [ ] Video feeds at bottom, square
- [ ] Crop/fit toggle works
- [ ] Nav is overlaid at top
- [ ] Game end shows splash animation
- [ ] Winner/loser effects on video feeds
- [ ] Play Again appears after splash

**Step 4: Commit any polish**

**Step 5: Deploy**

```bash
npx vercel deploy --prod
```
