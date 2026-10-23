import type { TimeControl } from '../chess/types'

export const TIME_CONTROLS: TimeControl[] = [
  { initial: 60, increment: 0, label: '1+0 Bullet' },
  { initial: 180, increment: 0, label: '3+0 Blitz' },
  { initial: 180, increment: 2, label: '3+2 Blitz' },
  { initial: 300, increment: 0, label: '5+0 Blitz' },
  { initial: 300, increment: 3, label: '5+3 Blitz' },
  { initial: 600, increment: 0, label: '10+0 Rapid' },
  { initial: 600, increment: 5, label: '10+5 Rapid' },
  { initial: 900, increment: 10, label: '15+10 Rapid' },
  { initial: 1800, increment: 0, label: '30+0 Classical' },
]

export const UNLIMITED: TimeControl = { initial: 0, increment: 0, label: 'No clock' }

export function formatClock(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const whole = Math.floor(clamped)
  const minutes = Math.floor(whole / 60)
  const secs = whole % 60
  if (clamped < 20) {
    const tenths = Math.floor((clamped - whole) * 10)
    return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
