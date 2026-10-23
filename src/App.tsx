import { useCallback, useEffect, useState } from 'react'
import { Board } from './components/Board'
import { PlayerBar } from './components/PlayerBar'
import { GameStatus } from './components/GameStatus'
import { Controls } from './components/Controls'
import { MoveList } from './components/MoveList'
import { PromotionDialog } from './components/PromotionDialog'
import { NewGameDialog } from './components/NewGameDialog'
import { SettingsPanel } from './components/SettingsPanel'
import { ShareDialog } from './components/ShareDialog'
import { EvalBar } from './components/EvalBar'
import { GameProvider } from './state/GameProvider'
import { useGame } from './state/gameContext'
import { SettingsProvider } from './state/settings'
import { materialValue, resultText } from './chess/format'
import { DIFFICULTIES } from './chess/ai/difficulty'
import type { Color, GameMode, GameResult } from './chess/types'

function playerNames(
  mode: GameMode,
  humanColor: Color,
): Record<Color, string> {
  if (mode === 'pvp') return { w: 'White', b: 'Black' }
  if (mode === 'cvc') return { w: 'Computer', b: 'Computer' }
  return humanColor === 'w'
    ? { w: 'You', b: 'Computer' }
    : { w: 'Computer', b: 'You' }
}

function GameOverOverlay({
  names,
  onRematch,
  onNewGame,
  onReview,
}: {
  names: Record<Color, string>
  onRematch: () => void
  onNewGame: () => void
  onReview: () => void
}) {
  const { result } = useGame()
  if (!result.over) return null
  return (
    <div className="game-over" role="alertdialog" aria-label="Game over">
      <div className="game-over-card">
        <h2>Game over</h2>
        <p className="game-over-result">{resultText(result, names)}</p>
        <div className="game-over-actions">
          <button type="button" className="btn btn-primary" onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className="btn" onClick={onNewGame}>
            New game
          </button>
          <button type="button" className="link-btn" onClick={onReview}>
            Review board
          </button>
        </div>
      </div>
    </div>
  )
}

function ChessApp() {
  const game = useGame()
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [dismissedGameResult, setDismissedGameResult] = useState<GameResult | null>(null)

  const overlayDismissed = dismissedGameResult === game.result

  const names = playerNames(game.mode, game.humanColor)
  const aiSubtitle =
    game.mode === 'pvp' ? undefined : DIFFICULTIES[game.difficulty].name

  const topColor: Color = game.flipped ? 'w' : 'b'
  const bottomColor: Color = game.flipped ? 'b' : 'w'

  const whiteAdvantage = Math.max(
    0,
    materialValue(game.captured.w) - materialValue(game.captured.b),
  )
  const blackAdvantage = Math.max(
    0,
    materialValue(game.captured.b) - materialValue(game.captured.w),
  )

  const handleRematch = useCallback(() => {
    game.newGame({
      mode: game.mode,
      humanColor: game.humanColor,
      timeControl: game.timeControl,
      difficulty: game.difficulty,
    })
  }, [game])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (target?.closest?.('.board')) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        game.goToPly((game.viewPly ?? game.livePly) - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        game.goToPly((game.viewPly ?? game.livePly) + 1)
      } else if (event.key.toLowerCase() === 'f') {
        game.setFlipped(!game.flipped)
      } else if (event.key.toLowerCase() === 'n') {
        setNewGameOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game])

  const clockSeconds = (color: Color): number | null =>
    game.clock.unlimited ? null : game.clock[color]

  const renderPlayer = (color: Color) => (
    <PlayerBar
      color={color}
      name={names[color]}
      subtitle={names[color] === 'Computer' ? aiSubtitle : undefined}
      seconds={clockSeconds(color)}
      increment={game.clock.increment}
      active={!game.result.over && game.turn === color}
      over={game.result.over}
      captured={game.captured[color]}
      advantage={color === 'w' ? whiteAdvantage : blackAdvantage}
      thinking={game.aiThinking && game.turn === color}
    />
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♞
          </span>
          <span className="brand-name">Gambit</span>
          <span className="brand-tag">chess</span>
        </div>
        <div className="header-actions">
          <span className="mode-badge">
            {game.mode === 'pvp'
              ? 'Player vs Player'
              : game.mode === 'pvc'
                ? 'Player vs Computer'
                : 'Computer vs Computer'}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => setShareOpen(true)}
            title="Export or import FEN and PGN"
          >
            Share & PGN
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setNewGameOpen(true)}
          >
            New game
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="board-column">
          {renderPlayer(topColor)}
          <div className="board-area">
            <EvalBar />
            <Board />
            {game.result.over && !overlayDismissed && (
              <GameOverOverlay
                names={names}
                onRematch={handleRematch}
                onNewGame={() => {
                  setDismissedGameResult(game.result)
                  setNewGameOpen(true)
                }}
                onReview={() => setDismissedGameResult(game.result)}
              />
            )}
          </div>
          {renderPlayer(bottomColor)}
        </section>

        <aside className="sidebar">
          <GameStatus names={names} />
          <Controls
            onNewGame={() => setNewGameOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenShare={() => setShareOpen(true)}
          />
          <MoveList names={names} />
        </aside>
      </main>

      <PromotionDialog />
      <NewGameDialog open={newGameOpen} onClose={() => setNewGameOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <ChessApp />
      </GameProvider>
    </SettingsProvider>
  )
}
