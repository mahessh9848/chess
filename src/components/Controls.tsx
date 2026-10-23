import { useGame } from '../state/gameContext'
import type { Color } from '../chess/types'

interface ControlsProps {
  onNewGame: () => void
  onOpenSettings: () => void
  onOpenShare: () => void
}

export function Controls({ onNewGame, onOpenSettings, onOpenShare }: ControlsProps) {
  const {
    mode,
    humanColor,
    turn,
    result,
    livePly,
    viewPly,
    isLive,
    aiThinking,
    flipped,
    autoPlay,
    undo,
    resign,
    claimDraw,
    goToPly,
    setFlipped,
    setAutoPlay,
  } = useGame()

  const resignedColor: Color = mode === 'pvc' ? humanColor : turn
  const canResign = !result.over && mode !== 'cvc'
  const canDraw = !result.over && mode === 'pvp'
  const canUndo =
    livePly > 0 &&
    !aiThinking &&
    !result.over &&
    (mode !== 'cvc' || !autoPlay)

  return (
    <div className="controls">
      <div className="controls-row">
        <button type="button" className="btn btn-primary" onClick={onNewGame}>
          New game
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => undo()}
          disabled={!canUndo}
          title={
            canUndo
              ? 'Take back the last move'
              : 'Undo is unavailable right now'
          }
        >
          Undo
        </button>
        {mode === 'pvp' && (
          <button
            type="button"
            className="btn"
            onClick={claimDraw}
            disabled={!canDraw}
            title="Agree to a draw"
          >
            Draw
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => resign(resignedColor)}
          disabled={!canResign}
          title="Resign the current game"
        >
          Resign
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onOpenShare}
          title="Share / Export PGN & FEN"
          aria-label="Share and export"
        >
          📋
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setFlipped(!flipped)}
          title="Flip the board"
          aria-label="Flip the board"
        >
          ⟳
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onOpenSettings}
          title="Open settings"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>

      <div className="controls-row nav-row">
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => goToPly(0)}
          disabled={livePly === 0 || viewPly === 0}
          aria-label="Go to start"
          title="Start"
        >
          ⏮
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => goToPly((viewPly ?? livePly) - 1)}
          disabled={livePly === 0 || (viewPly ?? livePly) <= 0}
          aria-label="Previous move"
          title="Previous move"
        >
          ◀
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => goToPly((viewPly ?? livePly) + 1)}
          disabled={isLive}
          aria-label="Next move"
          title="Next move"
        >
          ▶
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => goToPly(null)}
          disabled={isLive}
          aria-label="Go to latest position"
          title="Latest position"
        >
          ⏭
        </button>
        {mode === 'cvc' && (
          <button
            type="button"
            className="btn play-toggle"
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? 'Pause' : 'Resume'}
          </button>
        )}
      </div>
    </div>
  )
}
