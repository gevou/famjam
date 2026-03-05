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
    <div className="h-dvh overflow-hidden flex flex-col bg-gradient-to-b from-indigo-500 to-purple-600 relative">
      {/* Top bar overlay */}
      <div
        data-testid="layout-top-bar"
        className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm px-3 py-2"
      >
        {topBar}
      </div>

      {/* Game board area — centered */}
      <div
        data-testid="layout-board-area"
        className="flex-1 flex items-center justify-center overflow-auto px-[10px] pt-12 pb-2"
      >
        <div className="w-full max-h-full">
          {gameBoard}
        </div>
      </div>

      {/* Video strip at bottom */}
      <div data-testid="layout-video-strip" className="shrink-0">
        {videoStrip}
      </div>

      {/* Splash overlay */}
      {splash}
    </div>
  )
}
