# Project Journal — FamJam

> Maintained by Claude Code sessions. Each entry captures what was done, why, and what's next.

## Project Overview

FamJam is a web-based family game platform where 2-4 players play simple turn-based games (starting with Tic-Tac-Toe and S.O.S.) while video chatting in real time via LiveKit. Built with Next.js 15, Supabase (auth, database, realtime), and LiveKit Cloud. Designed for a family with young children (ages 6 and 8.5, Greek native speakers learning English). Features a family account model where parents sign in with Google and kids just tap their avatar.

## Retrospective (auto-generated catch-up)

> This section was generated from git history to bootstrap the journal.

**Commits to date:**
- `bd98a43` Initial commit from Create Next App
- `23a3069` chore: scaffold Next.js project with Supabase, LiveKit, and Vitest

The project has just been initialized with the Next.js 15 App Router, TypeScript, Tailwind CSS, and ESLint. Core dependencies for Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`) and LiveKit (`@livekit/components-react`, `livekit-client`) have been installed. Vitest was configured for testing with React Testing Library support.

The repository is clean with no uncommitted changes. No design documents exist in the project folder yet, but planning docs are maintained separately at `/Users/me/dev/docs/plans/`:
- `2026-02-14-gamechat-design.md` — Full architecture and data model
- `2026-02-14-gamechat-implementation-plan.md` — 14-task implementation roadmap

**Current state:** Project scaffold complete. Ready to begin Task 2.

---

## Journal Entries

<!-- New entries go above this line, newest first -->

### 2026-02-15 — Project Kickoff

**What was done:**
- Designed the full architecture (Next.js + Supabase + LiveKit)
- Created design doc at `/Users/me/dev/docs/plans/2026-02-14-gamechat-design.md`
- Created implementation plan at `/Users/me/dev/docs/plans/2026-02-14-gamechat-implementation-plan.md`
- Scaffolded Next.js 15 project with TypeScript, Tailwind, Supabase client, LiveKit, and Vitest
- 14 tasks planned across 7 phases

**Key decisions:**
- **Family account model** (parents sign in with Google, kids just pick avatars) — Under-8 kids can't manage logins
- **Supabase over Firebase** — Relational data model (families → players → rooms) fits better than document structure
- **Adaptive video mode** — Spotlight mode for old iPad Mini 2 (only show active player's video, keep all audio) via manual LiveKit track subscription
- **Game engine as pluggable interface** — Adding new games is plug-and-play: implement the `GameDefinition` interface and register it

**Tech stack rationale:**
- **Next.js 15 (App Router):** Fast iteration, SSR for lobby, large ecosystem
- **LiveKit Cloud:** Open-source, Safari 11+ support (critical for iOS devices), manual track subscription for low-end hardware
- **Supabase:** Built-in Google OAuth, Postgres + Realtime for turn-based sync, RLS for family data isolation
- **Vitest:** Fast unit tests for game logic (TDD approach for Tic-Tac-Toe and S.O.S.)

**What's next:**
- **Task 2:** Supabase client setup and auth middleware
- **Task 3:** Database schema with RLS policies
- **Tasks 4-6:** Auth flow (Google sign-in), onboarding, player selection screen
- **Tasks 7-8:** Game logic (Tic-Tac-Toe and S.O.S.) with TDD
- **Tasks 9-11:** Lobby, LiveKit token endpoint, game room with video chat
- **Tasks 12-14:** Parent notifications, character SVG assets, end-to-end testing

**Game backlog (future):** Memory Match, Picture Quiz, Hangman, Math Battle, Word Scramble, Connect Four, UNO-like, Pictionary, Monopoly-lite
