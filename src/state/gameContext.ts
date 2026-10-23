import { createContext, useContext } from 'react'
import type { PieceSymbol } from 'chess.js'
import type {
  BoardGrid,
  CapturedPieces,
  Color,
  GameMode,
  GameResult,
  Move,
  PositionSnapshot,
  TimeControl,
} from '../chess/types'
import type { DifficultyLevel } from '../chess/ai/difficulty'
import type { ClockSnapshot } from '../hooks/useChessClock'

export interface NewGameConfig {
  mode: GameMode
  humanColor: Color
  timeControl: TimeControl
  difficulty: DifficultyLevel
}

export interface GameContextValue {
  mode: GameMode
  humanColor: Color
  timeControl: TimeControl
  difficulty: DifficultyLevel
  snapshot: PositionSnapshot
  grid: BoardGrid
  livePly: number
  viewPly: number | null
  isLive: boolean
  turn: Color
  inCheck: boolean
  result: GameResult
  moves: Move[]
  sans: string[]
  captured: CapturedPieces
  selected: string | null
  targets: Move[]
  interactive: boolean
  aiThinking: boolean
  pendingPromotion: { from: string; to: string; color: Color } | null
  clock: ClockSnapshot
  flipped: boolean
  autoPlay: boolean
  pgn: string
  evalScore: number
  onSquareClick: (square: string) => void
  onDrop: (from: string, to: string) => boolean
  confirmPromotion: (type: PieceSymbol) => void
  cancelPromotion: () => void
  newGame: (config: NewGameConfig) => void
  loadFen: (fen: string) => { ok: boolean; error?: string }
  loadPgn: (pgn: string) => { ok: boolean; error?: string }
  undo: () => void
  resign: (color: Color) => void
  claimDraw: () => void
  goToPly: (ply: number | null) => void
  setFlipped: (flipped: boolean) => void
  setAutoPlay: (value: boolean) => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within a GameProvider')
  return context
}
