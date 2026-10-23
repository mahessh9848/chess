import type { Color, PieceSymbol, Move } from 'chess.js'

export type { Color, PieceSymbol, Move }

export type GameMode = 'pvp' | 'pvc' | 'cvc'

export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  | 'threefold-repetition'
  | 'fifty-move-rule'
  | 'timeout'
  | 'resignation'
  | 'agreement'

export interface GameResult {
  over: boolean
  winner: Color | null
  reason: GameOverReason | null
}

export interface BoardPiece {
  square: string
  type: PieceSymbol
  color: Color
  id: string
}

export type BoardCell = BoardPiece | null
export type BoardGrid = BoardCell[][]

export interface PositionSnapshot {
  ply: number
  fen: string
  grid: BoardGrid
  turn: Color
  lastMove: { from: string; to: string } | null
  check: boolean
}

export interface CapturedPieces {
  w: PieceSymbol[]
  b: PieceSymbol[]
}

export interface TimeControl {
  initial: number
  increment: number
  label: string
}

export interface ClockState {
  w: number
  b: number
  increment: number
  active: Color | null
  running: boolean
}

export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
