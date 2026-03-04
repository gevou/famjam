'use client'

import { useEffect } from 'react'

interface GameEndSplashProps {
  isWinner: boolean
  variantIndex: number
  winnerName: string
  onComplete: () => void
}

function ConfettiVariant() {
  const pieces = Array.from({ length: 35 }, (_, i) => {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#ff6348']
    const color = colors[i % colors.length]
    const left = `${Math.random() * 100}%`
    const delay = `${Math.random() * 2}s`
    const duration = `${1.5 + Math.random() * 2}s`
    const size = `${6 + Math.random() * 10}px`
    const isCircle = i % 3 === 0
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left,
          top: '-20px',
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: isCircle ? '50%' : '2px',
          animationName: 'confetti-fall',
          animationDuration: duration,
          animationDelay: delay,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationFillMode: 'both',
        }}
      />
    )
  })

  return <div data-testid="splash-confetti">{pieces}</div>
}

function FireworksVariant() {
  const bursts = Array.from({ length: 6 }, (_, i) => {
    const left = `${15 + Math.random() * 70}%`
    const top = `${15 + Math.random() * 60}%`
    const delay = `${i * 0.4}s`
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#01a3a4']
    const sparks = Array.from({ length: 10 }, (_, j) => {
      const angle = (j / 10) * 360
      const rad = (angle * Math.PI) / 180
      return (
        <div
          key={j}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors[(i + j) % colors.length],
            animationName: 'firework-burst',
            animationDuration: '1.2s',
            animationDelay: delay,
            animationTimingFunction: 'ease-out',
            animationIterationCount: 'infinite',
            animationFillMode: 'both',
            // Use CSS custom properties for direction
            transform: `translate(-50%, -50%)`,
            ['--burst-x' as string]: `${Math.cos(rad) * 60}px`,
            ['--burst-y' as string]: `${Math.sin(rad) * 60}px`,
          }}
        />
      )
    })
    return (
      <div key={i} style={{ position: 'absolute', left, top }}>
        {sparks}
      </div>
    )
  })

  return <div data-testid="splash-fireworks">{bursts}</div>
}

function TrophyVariant() {
  return (
    <div data-testid="splash-trophy" style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: '120px',
          animationName: 'trophy-drop',
          animationDuration: '1.2s',
          animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          animationFillMode: 'both',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            animationName: 'glow-pulse',
            animationDuration: '1.5s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}
        >
          🏆
        </span>
      </div>
    </div>
  )
}

function RainVariant() {
  const drops = Array.from({ length: 25 }, (_, i) => {
    const left = `${Math.random() * 100}%`
    const delay = `${Math.random() * 1.5}s`
    const duration = `${0.8 + Math.random() * 0.8}s`
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left,
          top: '60px',
          width: '2px',
          height: '18px',
          backgroundColor: 'rgba(100, 180, 255, 0.7)',
          borderRadius: '1px',
          animationName: 'rain-fall',
          animationDuration: duration,
          animationDelay: delay,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationFillMode: 'both',
        }}
      />
    )
  })

  return (
    <div data-testid="splash-rain">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(100, 150, 220, 0.15)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '64px' }}>
        🌧️
      </div>
      {drops}
    </div>
  )
}

function WobbleVariant({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="splash-wobble"
      style={{
        animationName: 'wobble',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      }}
    >
      {children}
    </div>
  )
}

function SpotlightVariant() {
  return (
    <div data-testid="splash-spotlight">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          animationName: 'spotlight-pulse',
          animationDuration: '2s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        }}
      />
    </div>
  )
}

const keyframesStyles = `
@keyframes confetti-fall {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0.5; }
}
@keyframes firework-burst {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  50% { transform: translate(calc(-50% + var(--burst-x, 40px)), calc(-50% + var(--burst-y, 40px))) scale(1); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--burst-x, 40px)), calc(-50% + var(--burst-y, 40px))) scale(0.5); opacity: 0; }
}
@keyframes trophy-drop {
  0% { transform: translateY(-100vh); }
  60% { transform: translateY(10px); }
  80% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}
@keyframes glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); }
  50% { filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9)); }
}
@keyframes rain-fall {
  0% { transform: translateY(0); opacity: 0.7; }
  100% { transform: translateY(90vh); opacity: 0; }
}
@keyframes wobble {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-5deg) scale(0.97); }
  75% { transform: rotate(5deg) scale(0.95); }
}
@keyframes spotlight-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
}
@keyframes scale-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
`

export function GameEndSplash({ isWinner, variantIndex, winnerName, onComplete }: GameEndSplashProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500)
    return () => clearTimeout(timer)
  }, [onComplete])

  const safeIndex = ((variantIndex % 3) + 3) % 3

  const renderWinnerVariant = () => {
    switch (safeIndex) {
      case 0:
        return <ConfettiVariant />
      case 1:
        return <FireworksVariant />
      case 2:
        return <TrophyVariant />
      default:
        return <ConfettiVariant />
    }
  }

  const renderLoserVariant = () => {
    switch (safeIndex) {
      case 0:
        return <RainVariant />
      case 1:
        return null // wobble wraps content
      case 2:
        return <SpotlightVariant />
      default:
        return <RainVariant />
    }
  }

  const messageContent = (
    <div
      style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        animationName: 'scale-in',
        animationDuration: '0.6s',
        animationFillMode: 'both',
      }}
    >
      <h1
        style={{
          fontSize: isWinner ? '4rem' : '3rem',
          fontWeight: 'bold',
          color: isWinner ? '#feca57' : '#dfe6e9',
          textShadow: isWinner
            ? '0 2px 10px rgba(0,0,0,0.5)'
            : '0 2px 8px rgba(0,0,0,0.4)',
          margin: 0,
        }}
      >
        {isWinner ? 'YOU WIN!' : 'Good game!'}
      </h1>
      {isWinner && (
        <p style={{ fontSize: '1.5rem', color: 'white', marginTop: '0.5rem' }}>
          Congrats, {winnerName}!
        </p>
      )}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: isWinner
          ? 'radial-gradient(ellipse at center, rgba(30, 0, 80, 0.92) 0%, rgba(10, 0, 40, 0.97) 100%)'
          : 'radial-gradient(ellipse at center, rgba(20, 30, 50, 0.92) 0%, rgba(10, 15, 30, 0.97) 100%)',
        overflow: 'hidden',
      }}
    >
      <style>{keyframesStyles}</style>

      {isWinner ? (
        <>
          {renderWinnerVariant()}
          {messageContent}
        </>
      ) : (
        <>
          {renderLoserVariant()}
          {safeIndex === 1 ? (
            <WobbleVariant>{messageContent}</WobbleVariant>
          ) : (
            messageContent
          )}
        </>
      )}
    </div>
  )
}
