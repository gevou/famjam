# FamJam Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based family game platform with live video chat, starting with Tic-Tac-Toe and S.O.S.

**Architecture:** Next.js app with Supabase (auth, database, realtime) and LiveKit (video/audio). Game logic runs client-side with a shared Game interface. Supabase Realtime channels sync moves between players. Adaptive video (grid vs spotlight) based on device capability.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Auth + Postgres + Realtime), LiveKit Cloud (@livekit/components-react), Tailwind CSS, Vitest for testing.

**Project directory:** `/Users/me/dev/famjam`

---

## Phase 1: Project Scaffolding & Supabase Setup

### Task 1: Initialize Next.js project

**Files:**
- Create: `famjam/` (via create-next-app)

**Step 1: Scaffold the project**

Run:
```bash
cd /Users/me/dev
npx create-next-app@latest famjam --typescript --tailwind --eslint --app --src-dir --use-npm
```

**Step 2: Install dependencies**

Run:
```bash
cd /Users/me/dev/famjam
npm install @supabase/supabase-js @supabase/ssr @livekit/components-react livekit-client
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

**Step 3: Configure Vitest**

Create `famjam/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `famjam/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 4: Verify setup**

Run:
```bash
cd /Users/me/dev/famjam
npm run build
```
Expected: Build succeeds with no errors.

**Step 5: Initialize git and commit**

Run:
```bash
cd /Users/me/dev/famjam
git init
git add .
git commit -m "chore: scaffold Next.js project with Supabase, LiveKit, and Vitest"
```

---

### Task 2: Set up Supabase project and environment variables

**Files:**
- Create: `famjam/.env.local`
- Create: `famjam/src/lib/supabase/client.ts`
- Create: `famjam/src/lib/supabase/server.ts`
- Create: `famjam/src/lib/supabase/middleware.ts`

**Step 1: Create Supabase project**

Manual step — go to https://supabase.com/dashboard and:
1. Create a new project called "famjam"
2. Copy the project URL and anon key
3. Enable Google Auth provider under Authentication > Providers > Google
   - You'll need a Google OAuth client ID from https://console.cloud.google.com/
   - Set authorized redirect URI to: `https://<supabase-project>.supabase.co/auth/v1/callback`

**Step 2: Create environment file**

Create `famjam/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

**Step 3: Create Supabase browser client**

Create `famjam/src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 4: Create Supabase server client**

Create `famjam/src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  )
}
```

**Step 5: Create auth middleware**

Create `famjam/src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

Create `famjam/src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Supabase client setup and auth middleware"
```

---

### Task 3: Create database schema

**Files:**
- Create: `famjam/supabase/migrations/001_initial_schema.sql`

**Step 1: Write the migration**

Create `famjam/supabase/migrations/001_initial_schema.sql`:
```sql
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
```

**Step 2: Apply migration**

Run the SQL in the Supabase Dashboard SQL Editor, or if using Supabase CLI:
```bash
cd /Users/me/dev/famjam
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

## Phase 2: Authentication & Family Profiles

### Task 4: Google sign-in flow

**Files:**
- Create: `famjam/src/app/login/page.tsx`
- Create: `famjam/src/app/auth/callback/route.ts`
- Modify: `famjam/src/app/page.tsx`
- Modify: `famjam/src/app/layout.tsx`

**Step 1: Create auth callback route**

Create `famjam/src/app/auth/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has a family — if not, redirect to onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('google_id', user.id)
          .single()

        if (player) {
          return NextResponse.redirect(`${origin}/home`)
        }
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

**Step 2: Create login page**

Create `famjam/src/app/login/page.tsx`:
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold text-white">FamJam</h1>
        <p className="text-xl text-indigo-100">Family Game Night, Anywhere</p>
        <button
          onClick={signInWithGoogle}
          className="bg-white text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
```

**Step 3: Update root page to redirect**

Replace `famjam/src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('google_id', user.id)
    .single()

  if (!player) redirect('/onboarding')

  redirect('/home')
}
```

**Step 4: Commit**

```bash
git add src/app/
git commit -m "feat: add Google sign-in flow with auth callback"
```

---

### Task 5: Family onboarding (first-time setup)

**Files:**
- Create: `famjam/src/app/onboarding/page.tsx`
- Create: `famjam/src/app/actions/family.ts`

**Step 1: Create server action for family setup**

Create `famjam/src/app/actions/family.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFamily(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const displayName = formData.get('displayName') as string
  const characterId = formData.get('characterId') as string

  // Create family
  const { data: family } = await supabase
    .from('families')
    .insert({})
    .select()
    .single()

  if (!family) throw new Error('Failed to create family')

  // Create parent player
  await supabase.from('players').insert({
    family_id: family.id,
    display_name: displayName,
    character_id: characterId,
    is_parent: true,
    google_id: user.id,
  })

  redirect('/home')
}

export async function addFamilyMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get parent's family
  const { data: parent } = await supabase
    .from('players')
    .select('family_id')
    .eq('google_id', user.id)
    .eq('is_parent', true)
    .single()

  if (!parent) throw new Error('Not a parent')

  const displayName = formData.get('displayName') as string
  const characterId = formData.get('characterId') as string

  await supabase.from('players').insert({
    family_id: parent.family_id,
    display_name: displayName,
    character_id: characterId,
    is_parent: false,
  })
}
```

**Step 2: Create onboarding page**

Create `famjam/src/app/onboarding/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createFamily } from '@/app/actions/family'

type Character = { id: string; name: string; image_url: string }

export default function OnboardingPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white text-center">Welcome! Set up your family</h1>
        <form action={createFamily} className="space-y-6">
          <div>
            <label className="block text-white text-lg mb-2">Your name</label>
            <input
              name="displayName"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl text-lg"
              placeholder="e.g., Dad, Mom, Papa..."
            />
          </div>
          <div>
            <label className="block text-white text-lg mb-2">Pick your character</label>
            <input type="hidden" name="characterId" value={selectedCharacter} />
            <div className="grid grid-cols-4 gap-3">
              {characters.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedCharacter(char.id)}
                  className={`p-3 rounded-xl bg-white/20 hover:bg-white/30 transition ${
                    selectedCharacter === char.id ? 'ring-4 ring-yellow-400 bg-white/40' : ''
                  }`}
                >
                  <img src={char.image_url} alt={char.name} className="w-12 h-12 mx-auto" />
                  <p className="text-white text-xs mt-1 text-center">{char.name}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!selectedCharacter}
            className="w-full bg-yellow-400 text-gray-900 py-4 rounded-xl text-lg font-bold disabled:opacity-50"
          >
            Create Family
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/onboarding/ src/app/actions/
git commit -m "feat: add family onboarding with character selection"
```

---

### Task 6: Family home screen (player select)

**Files:**
- Create: `famjam/src/app/home/page.tsx`
- Create: `famjam/src/app/home/add-member-dialog.tsx`
- Create: `famjam/src/lib/hooks/use-family.ts`

**Step 1: Create family data hook**

Create `famjam/src/lib/hooks/use-family.ts`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Player = {
  id: string
  display_name: string
  character_id: string
  is_parent: boolean
  characters: { name: string; image_url: string }
}

export function useFamily() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: parent } = await supabase
        .from('players')
        .select('family_id')
        .eq('google_id', user.id)
        .single()

      if (!parent) return

      const { data } = await supabase
        .from('players')
        .select('*, characters(name, image_url)')
        .eq('family_id', parent.family_id)
        .order('created_at')

      if (data) setPlayers(data as any)
      setLoading(false)
    }
    load()
  }, [])

  return { players, loading }
}
```

**Step 2: Create home page**

Create `famjam/src/app/home/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/lib/hooks/use-family'
import { AddMemberDialog } from './add-member-dialog'

export default function HomePage() {
  const { players, loading } = useFamily()
  const [showAddMember, setShowAddMember] = useState(false)
  const router = useRouter()

  function selectPlayer(playerId: string) {
    // Store active player in sessionStorage (per-tab, supports multi-device)
    sessionStorage.setItem('activePlayerId', playerId)
    router.push('/lobby')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <h1 className="text-3xl font-bold text-white text-center mb-8">Who's playing?</h1>
      <div className="max-w-lg mx-auto grid grid-cols-2 gap-6">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => selectPlayer(player.id)}
            className="bg-white/20 hover:bg-white/30 rounded-2xl p-6 text-center transition"
          >
            <img
              src={player.characters?.image_url}
              alt={player.characters?.name}
              className="w-20 h-20 mx-auto mb-3"
            />
            <p className="text-white text-xl font-semibold">{player.display_name}</p>
          </button>
        ))}
        <button
          onClick={() => setShowAddMember(true)}
          className="bg-white/10 hover:bg-white/20 rounded-2xl p-6 text-center border-2 border-dashed border-white/30 transition"
        >
          <div className="text-4xl text-white/60 mb-3">+</div>
          <p className="text-white/60 text-lg">Add player</p>
        </button>
      </div>
      {showAddMember && (
        <AddMemberDialog onClose={() => setShowAddMember(false)} />
      )}
    </div>
  )
}
```

**Step 3: Create add member dialog**

Create `famjam/src/app/home/add-member-dialog.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addFamilyMember } from '@/app/actions/family'

type Character = { id: string; name: string; image_url: string }

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])

  async function handleSubmit(formData: FormData) {
    await addFamilyMember(formData)
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Add family member</h2>
        <form action={handleSubmit} className="space-y-4">
          <input
            name="displayName"
            type="text"
            required
            placeholder="Name"
            className="w-full px-4 py-3 rounded-xl border text-lg"
          />
          <input type="hidden" name="characterId" value={selectedCharacter} />
          <div className="grid grid-cols-4 gap-2">
            {characters.map((char) => (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharacter(char.id)}
                className={`p-2 rounded-lg ${
                  selectedCharacter === char.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-gray-100'
                }`}
              >
                <img src={char.image_url} alt={char.name} className="w-10 h-10 mx-auto" />
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCharacter}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/home/ src/lib/hooks/
git commit -m "feat: add family home screen with player selection"
```

---

## Phase 3: Game Engine & Tic-Tac-Toe

### Task 7: Game engine interface and Tic-Tac-Toe logic (TDD)

**Files:**
- Create: `famjam/src/lib/games/types.ts`
- Create: `famjam/src/lib/games/tic-tac-toe.ts`
- Create: `famjam/src/lib/games/tic-tac-toe.test.ts`
- Create: `famjam/src/lib/games/registry.ts`

**Step 1: Define game interface**

Create `famjam/src/lib/games/types.ts`:
```typescript
export interface GameState {
  [key: string]: any
}

export interface Move {
  [key: string]: any
}

export interface GameStatus {
  finished: boolean
  winner?: string
  scores?: Record<string, number>
  /** If true, current player gets another turn (e.g., SOS scoring) */
  extraTurn?: boolean
}

export interface GameDefinition {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  initialState(playerIds: string[]): GameState
  validateMove(state: GameState, playerId: string, move: Move): boolean
  applyMove(state: GameState, playerId: string, move: Move): GameState
  getStatus(state: GameState): GameStatus
  getNextPlayer(state: GameState): string
}
```

**Step 2: Write failing tests for Tic-Tac-Toe**

Create `famjam/src/lib/games/tic-tac-toe.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { ticTacToe } from './tic-tac-toe'

describe('Tic-Tac-Toe', () => {
  const players = ['player1', 'player2']

  describe('initialState', () => {
    it('creates empty 3x3 board with player assignments', () => {
      const state = ticTacToe.initialState(players)
      expect(state.board).toEqual(Array(9).fill(null))
      expect(state.players).toEqual({ X: 'player1', O: 'player2' })
      expect(state.currentTurn).toBe('player1')
    })
  })

  describe('validateMove', () => {
    it('allows move on empty cell during player turn', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player1', { position: 0 })).toBe(true)
    })

    it('rejects move on occupied cell', () => {
      let state = ticTacToe.initialState(players)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      expect(ticTacToe.validateMove(state, 'player2', { position: 0 })).toBe(false)
    })

    it('rejects move when not player turn', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player2', { position: 0 })).toBe(false)
    })

    it('rejects move with out-of-range position', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player1', { position: 9 })).toBe(false)
      expect(ticTacToe.validateMove(state, 'player1', { position: -1 })).toBe(false)
    })
  })

  describe('applyMove', () => {
    it('places mark and switches turn', () => {
      const state = ticTacToe.initialState(players)
      const next = ticTacToe.applyMove(state, 'player1', { position: 4 })
      expect(next.board[4]).toBe('X')
      expect(next.currentTurn).toBe('player2')
    })
  })

  describe('getStatus', () => {
    it('detects horizontal win', () => {
      let state = ticTacToe.initialState(players)
      // X: 0, 1, 2 (top row)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      state = ticTacToe.applyMove(state, 'player2', { position: 3 })
      state = ticTacToe.applyMove(state, 'player1', { position: 1 })
      state = ticTacToe.applyMove(state, 'player2', { position: 4 })
      state = ticTacToe.applyMove(state, 'player1', { position: 2 })
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('player1')
    })

    it('detects diagonal win', () => {
      let state = ticTacToe.initialState(players)
      // X: 0, 4, 8 (diagonal)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      state = ticTacToe.applyMove(state, 'player2', { position: 1 })
      state = ticTacToe.applyMove(state, 'player1', { position: 4 })
      state = ticTacToe.applyMove(state, 'player2', { position: 2 })
      state = ticTacToe.applyMove(state, 'player1', { position: 8 })
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('player1')
    })

    it('detects draw', () => {
      let state = ticTacToe.initialState(players)
      // X O X / X X O / O X O
      const moves = [
        { p: 'player1', pos: 0 }, { p: 'player2', pos: 1 },
        { p: 'player1', pos: 2 }, { p: 'player2', pos: 5 },
        { p: 'player1', pos: 3 }, { p: 'player2', pos: 6 },
        { p: 'player1', pos: 4 }, { p: 'player2', pos: 8 },
        { p: 'player1', pos: 7 },
      ]
      for (const m of moves) {
        state = ticTacToe.applyMove(state, m.p, { position: m.pos })
      }
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBeUndefined()
    })

    it('returns not finished for in-progress game', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.getStatus(state).finished).toBe(false)
    })
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `cd /Users/me/dev/famjam && npx vitest run src/lib/games/tic-tac-toe.test.ts`
Expected: FAIL — module not found.

**Step 4: Implement Tic-Tac-Toe**

Create `famjam/src/lib/games/tic-tac-toe.ts`:
```typescript
import type { GameDefinition, GameState, Move, GameStatus } from './types'

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
]

export const ticTacToe: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  minPlayers: 2,
  maxPlayers: 2,

  initialState(playerIds: string[]): GameState {
    return {
      board: Array(9).fill(null),
      players: { X: playerIds[0], O: playerIds[1] },
      currentTurn: playerIds[0],
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    if (state.currentTurn !== playerId) return false
    const pos = move.position
    if (pos < 0 || pos > 8) return false
    if (state.board[pos] !== null) return false
    return true
  },

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const mark = state.players.X === playerId ? 'X' : 'O'
    const board = [...state.board]
    board[move.position] = mark
    const nextPlayer = state.players.X === playerId ? state.players.O : state.players.X
    return { ...state, board, currentTurn: nextPlayer }
  },

  getStatus(state: GameState): GameStatus {
    for (const [a, b, c] of WIN_LINES) {
      if (state.board[a] && state.board[a] === state.board[b] && state.board[b] === state.board[c]) {
        const winnerMark = state.board[a]
        return { finished: true, winner: state.players[winnerMark] }
      }
    }
    if (state.board.every((cell: string | null) => cell !== null)) {
      return { finished: true }
    }
    return { finished: false }
  },

  getNextPlayer(state: GameState): string {
    return state.currentTurn
  },
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/me/dev/famjam && npx vitest run src/lib/games/tic-tac-toe.test.ts`
Expected: All tests PASS.

**Step 6: Create game registry**

Create `famjam/src/lib/games/registry.ts`:
```typescript
import type { GameDefinition } from './types'
import { ticTacToe } from './tic-tac-toe'

const games: Record<string, GameDefinition> = {
  'tic-tac-toe': ticTacToe,
}

export function getGame(id: string): GameDefinition {
  const game = games[id]
  if (!game) throw new Error(`Unknown game: ${id}`)
  return game
}

export function listGames(): GameDefinition[] {
  return Object.values(games)
}

export function registerGame(game: GameDefinition) {
  games[game.id] = game
}
```

**Step 7: Commit**

```bash
git add src/lib/games/
git commit -m "feat: add game engine interface and tic-tac-toe with tests"
```

---

### Task 8: S.O.S. game logic (TDD)

**Files:**
- Create: `famjam/src/lib/games/sos.ts`
- Create: `famjam/src/lib/games/sos.test.ts`
- Modify: `famjam/src/lib/games/registry.ts`

**Step 1: Write failing tests for S.O.S.**

Create `famjam/src/lib/games/sos.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { sos } from './sos'

describe('S.O.S.', () => {
  const players = ['alice', 'bob']

  describe('initialState', () => {
    it('creates empty board with default 5x5 size', () => {
      const state = sos.initialState(players)
      expect(state.board).toEqual(Array(25).fill(null))
      expect(state.size).toBe(5)
      expect(state.playerOrder).toEqual(['alice', 'bob'])
      expect(state.scores).toEqual({ alice: 0, bob: 0 })
      expect(state.currentTurn).toBe('alice')
      expect(state.variant).toBe('general')
    })
  })

  describe('validateMove', () => {
    it('allows placing S or O on empty cell during turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'S' })).toBe(true)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'O' })).toBe(true)
    })

    it('rejects invalid letter', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'X' })).toBe(false)
    })

    it('rejects occupied cell', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      expect(sos.validateMove(state, 'bob', { position: 0, letter: 'O' })).toBe(false)
    })

    it('rejects wrong player turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'bob', { position: 0, letter: 'S' })).toBe(false)
    })
  })

  describe('SOS detection', () => {
    it('detects horizontal SOS', () => {
      let state = sos.initialState(players)
      // Place S-O-S in first row: positions 0, 1, 2
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('gives extra turn when scoring', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      // Alice scored, so it's still Alice's turn
      expect(state.currentTurn).toBe('alice')
    })

    it('detects vertical SOS', () => {
      let state = sos.initialState(players)
      // Column: positions 0, 5, 10 on 5x5
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 5, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 10, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('detects diagonal SOS', () => {
      let state = sos.initialState(players)
      // Diagonal: positions 0, 6, 12 on 5x5
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 6, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 12, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('awards multiple SOS for a single move', () => {
      let state = sos.initialState(players)
      // Set up so one move completes two SOS patterns
      // Row 0: S O _ and Col 0: S _ _  / _ O _ / _ _ S
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' }) // (0,0)
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })   // (0,1)
      state = sos.applyMove(state, 'alice', { position: 5, letter: 'O' }) // (1,0)
      state = sos.applyMove(state, 'bob', { position: 10, letter: 'S' }) // (2,0)
      // Now alice places S at (0,2) = position 2, completing row SOS
      // Bob already completed column SOS with position 10
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })
  })

  describe('getStatus (general variant)', () => {
    it('game not finished while board has empty cells', () => {
      const state = sos.initialState(players)
      expect(sos.getStatus(state).finished).toBe(false)
    })

    it('game finishes when board is full, highest score wins', () => {
      // Use a tiny 3x3 board for this test
      let state = sos.initialState(players)
      state = { ...state, size: 3, board: Array(9).fill(null) }
      // Fill all cells
      const moves = [
        { p: 'alice', pos: 0, l: 'S' }, { p: 'bob', pos: 1, l: 'O' },
        { p: 'alice', pos: 2, l: 'S' }, // alice scores SOS row, gets extra turn
        { p: 'alice', pos: 3, l: 'S' }, { p: 'bob', pos: 4, l: 'O' },
        { p: 'alice', pos: 5, l: 'S' }, // alice scores again
        { p: 'alice', pos: 6, l: 'S' }, { p: 'bob', pos: 7, l: 'O' },
        { p: 'alice', pos: 8, l: 'S' }, // alice scores again
      ]
      for (const m of moves) {
        state = sos.applyMove(state, m.p, { position: m.pos, letter: m.l })
      }
      const status = sos.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('alice')
    })
  })

  describe('supports 3-4 players', () => {
    it('rotates turns among 3 players', () => {
      const threePlayers = ['alice', 'bob', 'charlie']
      let state = sos.initialState(threePlayers)
      expect(state.currentTurn).toBe('alice')
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      expect(state.currentTurn).toBe('bob')
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      expect(state.currentTurn).toBe('charlie')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/me/dev/famjam && npx vitest run src/lib/games/sos.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement S.O.S.**

Create `famjam/src/lib/games/sos.ts`:
```typescript
import type { GameDefinition, GameState, Move, GameStatus } from './types'

// Direction vectors: [rowDelta, colDelta]
const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
]

function countNewSOS(board: (string | null)[], size: number, position: number): number {
  const row = Math.floor(position / size)
  const col = position % size
  const letter = board[position]
  let count = 0

  for (const [dr, dc] of DIRECTIONS) {
    if (letter === 'S') {
      // Check if this S is the START of S-O-S (look forward: +1, +2)
      const oRow = row + dr, oCol = col + dc
      const sRow = row + 2 * dr, sCol = col + 2 * dc
      if (sRow >= 0 && sRow < size && sCol >= 0 && sCol < size &&
          oRow >= 0 && oRow < size && oCol >= 0 && oCol < size) {
        if (board[oRow * size + oCol] === 'O' && board[sRow * size + sCol] === 'S') {
          count++
        }
      }
      // Check if this S is the END of S-O-S (look backward: -1, -2)
      const oRow2 = row - dr, oCol2 = col - dc
      const sRow2 = row - 2 * dr, sCol2 = col - 2 * dc
      if (sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size &&
          oRow2 >= 0 && oRow2 < size && oCol2 >= 0 && oCol2 < size) {
        if (board[oRow2 * size + oCol2] === 'O' && board[sRow2 * size + sCol2] === 'S') {
          count++
        }
      }
    } else if (letter === 'O') {
      // Check if this O is the MIDDLE of S-O-S (look both sides: -1 and +1)
      const sRow1 = row - dr, sCol1 = col - dc
      const sRow2 = row + dr, sCol2 = col + dc
      if (sRow1 >= 0 && sRow1 < size && sCol1 >= 0 && sCol1 < size &&
          sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size) {
        if (board[sRow1 * size + sCol1] === 'S' && board[sRow2 * size + sCol2] === 'S') {
          count++
        }
      }
    }
  }

  return count
}

export const sos: GameDefinition = {
  id: 'sos',
  name: 'S.O.S.',
  minPlayers: 2,
  maxPlayers: 4,

  initialState(playerIds: string[]): GameState {
    const size = 5
    const scores: Record<string, number> = {}
    for (const id of playerIds) scores[id] = 0
    return {
      board: Array(size * size).fill(null),
      size,
      variant: 'general',
      playerOrder: [...playerIds],
      currentTurnIndex: 0,
      currentTurn: playerIds[0],
      scores,
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    if (state.currentTurn !== playerId) return false
    const { position, letter } = move
    if (letter !== 'S' && letter !== 'O') return false
    if (position < 0 || position >= state.board.length) return false
    if (state.board[position] !== null) return false
    return true
  },

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const board = [...state.board]
    board[move.position] = move.letter
    const newSOS = countNewSOS(board, state.size, move.position)
    const scores = { ...state.scores }
    scores[playerId] = (scores[playerId] || 0) + newSOS

    // Extra turn if scored, otherwise advance to next player
    let nextIndex = state.currentTurnIndex
    if (newSOS === 0) {
      nextIndex = (state.currentTurnIndex + 1) % state.playerOrder.length
    }

    return {
      ...state,
      board,
      scores,
      currentTurnIndex: nextIndex,
      currentTurn: state.playerOrder[nextIndex],
    }
  },

  getStatus(state: GameState): GameStatus {
    const boardFull = state.board.every((cell: string | null) => cell !== null)

    if (state.variant === 'simple') {
      // First SOS wins
      for (const [id, score] of Object.entries(state.scores)) {
        if ((score as number) > 0) return { finished: true, winner: id, scores: state.scores }
      }
      if (boardFull) return { finished: true, scores: state.scores }
      return { finished: false }
    }

    // General variant: play until full
    if (!boardFull) return { finished: false }

    const maxScore = Math.max(...Object.values(state.scores) as number[])
    const winners = Object.entries(state.scores).filter(([, s]) => s === maxScore)
    if (winners.length === 1) {
      return { finished: true, winner: winners[0][0], scores: state.scores }
    }
    // Tie
    return { finished: true, scores: state.scores }
  },

  getNextPlayer(state: GameState): string {
    return state.currentTurn
  },
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/me/dev/famjam && npx vitest run src/lib/games/sos.test.ts`
Expected: All tests PASS.

**Step 5: Register S.O.S. in game registry**

Add to `famjam/src/lib/games/registry.ts`:
```typescript
import { sos } from './sos'

// Add to the games record:
const games: Record<string, GameDefinition> = {
  'tic-tac-toe': ticTacToe,
  'sos': sos,
}
```

**Step 6: Run all game tests**

Run: `cd /Users/me/dev/famjam && npx vitest run src/lib/games/`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add src/lib/games/
git commit -m "feat: add S.O.S. game logic with tests"
```

---

## Phase 4: Lobby & Room Management

### Task 9: Lobby page and room creation

**Files:**
- Create: `famjam/src/app/lobby/page.tsx`
- Create: `famjam/src/app/actions/rooms.ts`
- Create: `famjam/src/lib/hooks/use-active-player.ts`

**Step 1: Create active player hook**

Create `famjam/src/lib/hooks/use-active-player.ts`:
```typescript
'use client'

import { useState, useEffect } from 'react'

export function useActivePlayer() {
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setPlayerId(sessionStorage.getItem('activePlayerId'))
  }, [])

  return playerId
}
```

**Step 2: Create room server actions**

Create `famjam/src/app/actions/rooms.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function createRoom(formData: FormData) {
  const supabase = await createClient()
  const gameType = formData.get('gameType') as string
  const maxPlayers = parseInt(formData.get('maxPlayers') as string)
  const playerId = formData.get('playerId') as string

  // Get player's family
  const { data: player } = await supabase
    .from('players')
    .select('family_id')
    .eq('id', playerId)
    .single()

  if (!player) throw new Error('Player not found')

  const { data: room } = await supabase
    .from('rooms')
    .insert({
      family_id: player.family_id,
      game_type: gameType,
      max_players: maxPlayers,
      created_by: playerId,
    })
    .select()
    .single()

  if (!room) throw new Error('Failed to create room')

  // Join the creator to the room
  await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: playerId,
    seat_number: 0,
  })

  return room.id
}

export async function joinRoom(roomId: string, playerId: string) {
  const supabase = await createClient()

  // Count current players
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)

  await supabase.from('room_players').insert({
    room_id: roomId,
    player_id: playerId,
    seat_number: count || 0,
  })

  return roomId
}
```

**Step 3: Create lobby page**

Create `famjam/src/app/lobby/page.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { listGames } from '@/lib/games/registry'
import { createRoom, joinRoom } from '@/app/actions/rooms'

type Room = {
  id: string
  game_type: string
  max_players: number
  status: string
  created_by: string
  players: { display_name: string }
  room_players: { player_id: string }[]
}

export default function LobbyPage() {
  const playerId = useActivePlayer()
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const games = listGames()

  useEffect(() => {
    if (!playerId) return

    // Load active rooms for this player's family
    async function loadRooms() {
      const { data: player } = await supabase
        .from('players')
        .select('family_id')
        .eq('id', playerId)
        .single()

      if (!player) return

      const { data } = await supabase
        .from('rooms')
        .select('*, players!rooms_created_by_fkey(display_name), room_players(player_id)')
        .eq('family_id', player.family_id)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })

      if (data) setRooms(data as any)
    }

    loadRooms()

    // Subscribe to room changes
    const channel = supabase
      .channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        loadRooms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => {
        loadRooms()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playerId])

  async function handleCreate(formData: FormData) {
    formData.set('playerId', playerId!)
    const roomId = await createRoom(formData)
    router.push(`/room/${roomId}`)
  }

  async function handleJoin(roomId: string) {
    await joinRoom(roomId, playerId!)
    router.push(`/room/${roomId}`)
  }

  if (!playerId) {
    return <div className="min-h-screen flex items-center justify-center">
      <p>No player selected. <a href="/home" className="underline">Go back</a></p>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Game Lobby</h1>

        {/* Active rooms */}
        <div className="space-y-3 mb-8">
          {rooms.length === 0 && (
            <p className="text-indigo-200 text-center py-8">No active games. Start one!</p>
          )}
          {rooms.map((room) => (
            <div key={room.id} className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">
                  {games.find(g => g.id === room.game_type)?.name || room.game_type}
                </p>
                <p className="text-indigo-200 text-sm">
                  {room.players?.display_name} &middot; {room.room_players?.length}/{room.max_players} players
                </p>
              </div>
              {room.status === 'waiting' && !room.room_players?.some(rp => rp.player_id === playerId) && (
                <button
                  onClick={() => handleJoin(room.id)}
                  className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Join
                </button>
              )}
              {room.room_players?.some(rp => rp.player_id === playerId) && (
                <button
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="bg-green-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Enter
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create room */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full bg-yellow-400 text-gray-900 py-4 rounded-xl text-lg font-bold"
        >
          Start a Game
        </button>

        {showCreate && (
          <form action={handleCreate} className="mt-4 bg-white/20 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-white mb-2">Game</label>
              <select name="gameType" className="w-full px-4 py-3 rounded-lg text-lg">
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white mb-2">Max players</label>
              <select name="maxPlayers" className="w-full px-4 py-3 rounded-lg text-lg">
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-green-400 text-gray-900 py-3 rounded-lg font-bold">
              Create Room
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/lobby/ src/app/actions/rooms.ts src/lib/hooks/use-active-player.ts
git commit -m "feat: add lobby with room creation and real-time updates"
```

---

## Phase 5: Game Room with Video Chat

### Task 10: LiveKit token endpoint

**Files:**
- Create: `famjam/src/app/api/livekit-token/route.ts`

**Step 1: Install LiveKit server SDK**

Run:
```bash
cd /Users/me/dev/famjam
npm install livekit-server-sdk
```

**Step 2: Create token endpoint**

Create `famjam/src/app/api/livekit-token/route.ts`:
```typescript
import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get('room')
  const participantName = req.nextUrl.searchParams.get('name')
  const participantId = req.nextUrl.searchParams.get('id')

  if (!roomName || !participantName || !participantId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  })

  const token = await at.toJwt()
  return NextResponse.json({ token })
}
```

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: add LiveKit token generation endpoint"
```

---

### Task 11: Game room page (video + game board)

**Files:**
- Create: `famjam/src/app/room/[roomId]/page.tsx`
- Create: `famjam/src/components/video-chat.tsx`
- Create: `famjam/src/components/games/tic-tac-toe-board.tsx`
- Create: `famjam/src/components/games/sos-board.tsx`
- Create: `famjam/src/lib/hooks/use-game-room.ts`

**Step 1: Create game room realtime hook**

Create `famjam/src/lib/hooks/use-game-room.ts`:
```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGame } from '@/lib/games/registry'
import type { GameState, Move } from '@/lib/games/types'

export function useGameRoom(roomId: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Load room
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      setRoom(roomData)

      // Load players in room
      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('*, players(id, display_name, character_id, characters(name, image_url))')
        .eq('room_id', roomId)
        .order('seat_number')
      setPlayers(roomPlayers || [])

      // Load game state
      const { data: stateData } = await supabase
        .from('game_states')
        .select('*')
        .eq('room_id', roomId)
        .single()

      if (stateData) {
        setGameState(stateData.state_json)
      }
    }
    load()

    // Subscribe to game state changes via Realtime broadcast
    const channel = supabase.channel(`room:${roomId}`)
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        setGameState(payload.state)
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        setGameState(payload.state)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  const makeMove = useCallback(async (move: Move) => {
    if (!gameState || !room) return

    const game = getGame(room.game_type)
    if (!game.validateMove(gameState, playerId, move)) return

    const newState = game.applyMove(gameState, playerId, move)
    setGameState(newState)

    // Broadcast to other players
    const channel = supabase.channel(`room:${roomId}`)
    await channel.send({
      type: 'broadcast',
      event: 'move',
      payload: { state: newState, move, playerId },
    })

    // Persist to database
    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: newState,
      current_turn_player_id: game.getNextPlayer(newState),
      updated_at: new Date().toISOString(),
    })

    await supabase.from('moves').insert({
      room_id: roomId,
      player_id: playerId,
      move_json: move,
    })
  }, [gameState, room, playerId, roomId])

  const startGame = useCallback(async () => {
    if (!room || !players.length) return

    const game = getGame(room.game_type)
    const playerIds = players.map((rp: any) => rp.players.id)
    const initialState = game.initialState(playerIds)

    setGameState(initialState)

    // Broadcast and persist
    const channel = supabase.channel(`room:${roomId}`)
    await channel.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { state: initialState },
    })

    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: initialState,
      current_turn_player_id: game.getNextPlayer(initialState),
    })

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
  }, [room, players, roomId])

  return { gameState, room, players, makeMove, startGame }
}
```

**Step 2: Create video chat component**

Create `famjam/src/components/video-chat.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  TrackToggle,
  AudioTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

function VideoGrid({ activeTurnPlayerId, liteMode }: { activeTurnPlayerId?: string; liteMode: boolean }) {
  const tracks = useTracks([Track.Source.Camera])
  const audioTracks = useTracks([Track.Source.Microphone])

  const visibleTracks = liteMode && activeTurnPlayerId
    ? tracks.filter(t => t.participant.identity === activeTurnPlayerId)
    : tracks

  return (
    <div className={`grid gap-2 ${visibleTracks.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {visibleTracks.map((track) => (
        <div
          key={track.participant.sid}
          className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video ${
            track.participant.identity === activeTurnPlayerId ? 'ring-4 ring-yellow-400' : ''
          }`}
        >
          <VideoTrack trackRef={track} className="w-full h-full object-cover" />
          <p className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
            {track.participant.name}
          </p>
        </div>
      ))}
      {/* Always render all audio tracks even in lite mode */}
      {liteMode && audioTracks.map((track) => (
        <AudioTrack key={track.participant.sid} trackRef={track} />
      ))}
    </div>
  )
}

export function VideoChat({
  roomId,
  playerId,
  playerName,
  activeTurnPlayerId,
}: {
  roomId: string
  playerId: string
  playerName: string
  activeTurnPlayerId?: string
}) {
  const [token, setToken] = useState<string>('')
  const [liteMode, setLiteMode] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  useEffect(() => {
    // Detect low-end device
    const memory = (navigator as any).deviceMemory
    if (memory && memory < 2) setLiteMode(true)
  }, [])

  useEffect(() => {
    fetch(`/api/livekit-token?room=${roomId}&name=${encodeURIComponent(playerName)}&id=${playerId}`)
      .then(r => r.json())
      .then(data => setToken(data.token))
  }, [roomId, playerId, playerName])

  if (!token) return <div className="text-white">Connecting video...</div>

  return (
    <div className="space-y-2">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        video={true}
        audio={!audioMuted}
        className="rounded-xl"
      >
        <VideoGrid activeTurnPlayerId={activeTurnPlayerId} liteMode={liteMode} />
      </LiveKitRoom>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setAudioMuted(!audioMuted)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            audioMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
          }`}
        >
          {audioMuted ? 'Unmute Mic' : 'Mute Mic'}
        </button>
        <button
          onClick={() => setLiteMode(!liteMode)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 text-white"
        >
          {liteMode ? 'Show All Video' : 'Lite Mode'}
        </button>
      </div>
    </div>
  )
}
```

**Step 3: Create Tic-Tac-Toe board component**

Create `famjam/src/components/games/tic-tac-toe-board.tsx`:
```typescript
'use client'

import type { GameState, Move } from '@/lib/games/types'

export function TicTacToeBoard({
  state,
  playerId,
  onMove,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
}) {
  const isMyTurn = state.currentTurn === playerId
  const myMark = state.players.X === playerId ? 'X' : 'O'

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white text-lg">
        {isMyTurn ? 'Your turn!' : "Opponent's turn..."}
        {' '}You are <span className="font-bold">{myMark}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 w-72 h-72">
        {state.board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => isMyTurn && !cell && onMove({ position: i })}
            disabled={!isMyTurn || !!cell}
            className={`bg-white/20 rounded-xl text-4xl font-bold text-white
              flex items-center justify-center
              ${isMyTurn && !cell ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'}
              ${cell === 'X' ? 'text-yellow-400' : cell === 'O' ? 'text-pink-400' : ''}`}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Create S.O.S. board component**

Create `famjam/src/components/games/sos-board.tsx`:
```typescript
'use client'

import { useState } from 'react'
import type { GameState, Move } from '@/lib/games/types'

export function SOSBoard({
  state,
  playerId,
  onMove,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
}) {
  const [selectedLetter, setSelectedLetter] = useState<'S' | 'O'>('S')
  const isMyTurn = state.currentTurn === playerId
  const size = state.size

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-white text-sm">
        {state.playerOrder.map((pid: string, i: number) => (
          <span key={pid} className={pid === state.currentTurn ? 'font-bold text-yellow-400' : ''}>
            Player {i + 1}: {state.scores[pid]} pts
            {pid === playerId && ' (you)'}
          </span>
        ))}
      </div>

      <p className="text-white text-lg">
        {isMyTurn ? 'Your turn!' : 'Waiting...'}
      </p>

      {/* Letter picker */}
      {isMyTurn && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLetter('S')}
            className={`w-14 h-14 rounded-xl text-2xl font-bold ${
              selectedLetter === 'S' ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            S
          </button>
          <button
            onClick={() => setSelectedLetter('O')}
            className={`w-14 h-14 rounded-xl text-2xl font-bold ${
              selectedLetter === 'O' ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            O
          </button>
        </div>
      )}

      {/* Board */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: `${size * 3.5}rem` }}
      >
        {state.board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => isMyTurn && !cell && onMove({ position: i, letter: selectedLetter })}
            disabled={!isMyTurn || !!cell}
            className={`aspect-square bg-white/20 rounded-lg text-xl font-bold text-white
              flex items-center justify-center
              ${isMyTurn && !cell ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'}`}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Create game room page**

Create `famjam/src/app/room/[roomId]/page.tsx`:
```typescript
'use client'

import { use } from 'react'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { useGameRoom } from '@/lib/hooks/use-game-room'
import { VideoChat } from '@/components/video-chat'
import { TicTacToeBoard } from '@/components/games/tic-tac-toe-board'
import { SOSBoard } from '@/components/games/sos-board'
import { getGame } from '@/lib/games/registry'

const BOARD_COMPONENTS: Record<string, any> = {
  'tic-tac-toe': TicTacToeBoard,
  'sos': SOSBoard,
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const playerId = useActivePlayer()
  const { gameState, room, players, makeMove, startGame } = useGameRoom(roomId, playerId || '')

  if (!playerId) return <div className="min-h-screen flex items-center justify-center text-white">No player selected</div>

  const currentPlayer = players.find((rp: any) => rp.players.id === playerId)
  const playerName = currentPlayer?.players?.display_name || 'Player'

  const gameStatus = gameState && room ? getGame(room.game_type).getStatus(gameState) : null
  const BoardComponent = room ? BOARD_COMPONENTS[room.game_type] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Video Chat */}
        <VideoChat
          roomId={roomId}
          playerId={playerId}
          playerName={playerName}
          activeTurnPlayerId={gameState?.currentTurn}
        />

        {/* Waiting / Game / Results */}
        {!gameState && (
          <div className="text-center space-y-4">
            <p className="text-white text-lg">
              Waiting for players... ({players.length}/{room?.max_players || '?'})
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((rp: any) => (
                <span key={rp.player_id} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {rp.players.display_name}
                </span>
              ))}
            </div>
            {players.length >= (room?.max_players || 2) && (
              <button
                onClick={startGame}
                className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
              >
                Start Game!
              </button>
            )}
          </div>
        )}

        {gameState && !gameStatus?.finished && BoardComponent && (
          <BoardComponent state={gameState} playerId={playerId} onMove={makeMove} />
        )}

        {gameStatus?.finished && (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus.winner
                ? gameStatus.winner === playerId ? 'You win!' : 'You lost!'
                : 'Draw!'}
            </h2>
            {gameStatus.scores && (
              <div className="flex gap-4 justify-center text-white">
                {Object.entries(gameStatus.scores).map(([pid, score]) => (
                  <span key={pid}>{players.find((rp: any) => rp.players.id === pid)?.players.display_name}: {score as number}</span>
                ))}
              </div>
            )}
            <button
              onClick={startGame}
              className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/app/room/ src/app/api/ src/components/ src/lib/hooks/use-game-room.ts
git commit -m "feat: add game room with video chat, tic-tac-toe and SOS boards"
```

---

## Phase 6: Parent Notifications

### Task 12: Notify parent when kid logs in

**Files:**
- Modify: `famjam/src/app/home/page.tsx`
- Create: `famjam/src/lib/notifications.ts`

**Step 1: Create notification utility**

Create `famjam/src/lib/notifications.ts`:
```typescript
'use client'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icon.png' })
}
```

**Step 2: Add notification on player select**

When a non-parent player is selected, broadcast a presence event that parent devices listen for. Modify the `selectPlayer` function in `famjam/src/app/home/page.tsx` to broadcast a Supabase Realtime event, and add a listener that triggers a browser notification for parents when a kid selects their profile.

The key additions:
- On player select, broadcast `{ event: 'player_login', playerId, playerName }` to a family channel.
- Parent devices subscribe to this channel and show a browser notification: "Niko just opened FamJam!"
- Request notification permission when a parent first visits the home page.

**Step 3: Commit**

```bash
git add src/app/home/ src/lib/notifications.ts
git commit -m "feat: notify parents when kids log into the app"
```

---

## Phase 7: Character Assets & Polish

### Task 13: Add character SVG assets

**Files:**
- Create: `famjam/public/characters/bear.svg` (and 7 others)

**Step 1: Create or source 8 simple animal SVG icons**

Use simple, colorful, kid-friendly animal illustrations. Options:
- Generate with an AI image tool
- Use open-source SVGs from [Lucide](https://lucide.dev/) or [OpenMoji](https://openmoji.org/)
- Create simple SVGs manually

Place 8 files in `famjam/public/characters/`:
`bear.svg`, `cat.svg`, `dog.svg`, `fox.svg`, `owl.svg`, `penguin.svg`, `rabbit.svg`, `tiger.svg`

**Step 2: Commit**

```bash
git add public/characters/
git commit -m "feat: add character avatar SVGs"
```

---

### Task 14: End-to-end smoke test

**Step 1: Start dev server**

Run: `cd /Users/me/dev/famjam && npm run dev`

**Step 2: Manual test checklist**

- [ ] Visit localhost:3000 — redirects to /login
- [ ] Sign in with Google — redirects to /onboarding (first time)
- [ ] Create family with name + character — redirects to /home
- [ ] See your avatar on home screen
- [ ] Add a family member (kid) profile
- [ ] Select your player — goes to /lobby
- [ ] Create a Tic-Tac-Toe room
- [ ] Open second browser/incognito, log in, select kid profile, join room
- [ ] Video appears for both players
- [ ] Play tic-tac-toe, moves sync in real time
- [ ] Winner/draw detected correctly
- [ ] "Play Again" works
- [ ] Test S.O.S. game similarly
- [ ] Test mute mic button
- [ ] Test lite mode toggle
- [ ] Test on iPad Mini 2 (if available) — lite mode auto-activates

**Step 3: Fix any issues found**

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```

---

## Summary

| Phase | Tasks | What you get |
|-------|-------|-------------|
| 1. Scaffolding | 1-3 | Next.js project, Supabase connected, DB schema |
| 2. Auth & Profiles | 4-6 | Google login, family onboarding, player select |
| 3. Game Engine | 7-8 | Tic-Tac-Toe + S.O.S. logic with full test coverage |
| 4. Lobby | 9 | Room creation, joining, real-time lobby |
| 5. Game Room | 10-11 | Video chat + game boards, real-time play |
| 6. Notifications | 12 | Parent alerts when kids open the app |
| 7. Polish | 13-14 | Character art, end-to-end testing |

**Total: 14 tasks across 7 phases.**
