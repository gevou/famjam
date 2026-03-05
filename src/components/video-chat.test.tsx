import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoFeed } from './video-chat'

// Mock LiveKit components
vi.mock('@livekit/components-react', () => ({
  VideoTrack: ({ className, style }: any) => <div data-testid="video-track" className={className} style={style} />,
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
    avatarUrl: undefined as string | undefined,
    videoTrack: null as any,
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

  it('applies object-fit contain when cropMode is false (fit)', () => {
    render(<VideoFeed {...baseProps} videoTrack={{} as any} cropMode={false} />)
    const track = screen.getByTestId('video-track')
    expect(track.style.objectFit).toBe('contain')
  })

  it('applies object-fit cover when cropMode is true (crop)', () => {
    render(<VideoFeed {...baseProps} videoTrack={{} as any} cropMode={true} />)
    const track = screen.getByTestId('video-track')
    expect(track.style.objectFit).toBe('cover')
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

  it('shows player name', () => {
    render(<VideoFeed {...baseProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

