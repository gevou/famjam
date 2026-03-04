import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameRoomLayout } from './game-room-layout'

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

  it('renders splash overlay when provided', () => {
    render(
      <GameRoomLayout
        topBar={<div>nav</div>}
        gameBoard={<div>board</div>}
        videoStrip={<div>videos</div>}
        splash={<div data-testid="splash">splash!</div>}
      />
    )
    expect(screen.getByTestId('splash')).toBeInTheDocument()
  })
})
