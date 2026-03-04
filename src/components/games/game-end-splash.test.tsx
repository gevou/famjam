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
