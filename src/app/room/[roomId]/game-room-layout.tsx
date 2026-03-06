'use client'

import { type ReactNode } from 'react'

export function GameRoomLayout({
  topBar,
  gameBoard,
  videoStrip,
  splash,
}: {
  topBar: ReactNode
  gameBoard: ReactNode
  videoStrip: ReactNode
  splash?: ReactNode
}) {
  return (
    <div className="h-dvh overflow-hidden relative bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900">
      {/* Layer 1: Game board — centered, fills space */}
      <div
        data-testid="layout-board-area"
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 140px), 150px)', paddingBottom: '8px' }}
      >
        <div className="w-full max-h-full overflow-auto px-3 md:px-6">
          {gameBoard}
        </div>
      </div>

      {/* Layer 2: Navigation — top corners */}
      <div
        data-testid="layout-top-bar"
        className="absolute top-0 left-0 right-0 z-30 px-3 pt-1"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 4px)' }}
      >
        {topBar}
      </div>

      {/* Layer 3: Video bubbles — below nav */}
      <div
        data-testid="layout-video-strip"
        className="absolute left-0 right-0 z-20 flex justify-center"
        style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 48px), 52px)' }}
      >
        {videoStrip}
      </div>

      {/* Splash overlay */}
      {splash}
    </div>
  )
}
