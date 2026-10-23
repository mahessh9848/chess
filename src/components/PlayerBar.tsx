import { CapturedPieces } from './CapturedPieces'
import { formatClock } from '../state/timeControls'
import type { Color, PieceSymbol } from '../chess/types'

interface PlayerBarProps {
  color: Color
  name: string
  subtitle?: string
  seconds: number | null
  increment: number
  active: boolean
  over: boolean
  captured: PieceSymbol[]
  advantage: number
  thinking: boolean
}

export function PlayerBar({
  color,
  name,
  subtitle,
  seconds,
  increment,
  active,
  over,
  captured,
  advantage,
  thinking,
}: PlayerBarProps) {
  const lowTime = seconds !== null && seconds > 0 && seconds <= 20
  const classes = ['player-bar']
  if (active) classes.push('active')
  if (over) classes.push('over')

  return (
    <div className={classes.join(' ')} data-color={color}>
      <span className={`player-dot ${color === 'w' ? 'dot-white' : 'dot-black'}`} aria-hidden="true" />
      <div className="player-meta">
        <div className="player-name">
          {name}
          {subtitle && <span className="player-subtitle">{subtitle}</span>}
        </div>
        <div className="player-captured-row">
          <CapturedPieces pieces={captured} color={color === 'w' ? 'b' : 'w'} advantage={advantage} />
        </div>
      </div>
      <div className="player-right">
        {thinking && <span className="thinking" role="status">thinking…</span>}
        {active && !over && (
          <span className="turn-flag" aria-label="to move">
            to move
          </span>
        )}
        {seconds !== null ? (
          <span
            className={`clock${lowTime ? ' low' : ''}${active && !over ? ' ticking' : ''}`}
            aria-label={`clock ${formatClock(seconds)}`}
          >
            {formatClock(seconds)}
            {increment > 0 && active && <span className="clock-inc">+{increment}</span>}
          </span>
        ) : (
          <span className="clock unlimited">∞</span>
        )}
      </div>
    </div>
  )
}
