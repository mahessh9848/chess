import { PIECE_VALUE, type Color, type GameResult, type PieceSymbol } from './types'

export function resultText(
  result: GameResult,
  names: Record<Color, string>,
): string {
  const winner = result.winner ? names[result.winner] : null
  switch (result.reason) {
    case 'checkmate':
      return `Checkmate — ${winner} wins`
    case 'timeout':
      return `${winner} wins on time`
    case 'resignation':
      return `${winner} wins — resignation`
    case 'stalemate':
      return 'Draw by stalemate'
    case 'insufficient-material':
      return 'Draw — insufficient material'
    case 'threefold-repetition':
      return 'Draw by repetition'
    case 'fifty-move-rule':
      return 'Draw by fifty-move rule'
    case 'agreement':
      return 'Draw by mutual agreement'
    default:
      return 'Game over'
  }
}

export function materialValue(pieces: PieceSymbol[]): number {
  return pieces.reduce((total, type) => total + PIECE_VALUE[type], 0)
}

/** Formats centipawn evaluation score to string like "+1.2", "-0.8", "0.0" */
export function formatEval(score: number): string {
  if (Math.abs(score) > 90_000) {
    // Mate score
    const movesToMate = Math.ceil((100_000 - Math.abs(score)) / 2)
    return score > 0 ? `+M${movesToMate}` : `-M${movesToMate}`
  }
  const pawns = (score / 100).toFixed(1)
  if (score > 0) return `+${pawns}`
  if (score < 0) return pawns
  return '0.0'
}

/** Calculates white advantage percentage for evaluation bar display (0..100) */
export function evalToPercentage(score: number): number {
  if (score >= 90_000) return 100
  if (score <= -90_000) return 0
  // Sigmoid curve mapping centipawns to percentage: 0 -> 50%, +400cp -> ~85%, -400cp -> ~15%
  const winProbability = 1 / (1 + Math.pow(10, -score / 400))
  return Math.min(96, Math.max(4, winProbability * 100))
}
