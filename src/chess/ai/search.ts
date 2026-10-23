import { Chess } from 'chess.js'
import type { Move } from 'chess.js'
import { evaluate, MATERIAL } from './evaluate'

const MATE = 100_000
const QUIESCENCE_MAX_DEPTH = 4

export interface SearchOptions {
  maxDepth: number
  timeMs: number
  /** Probability (0..1) of intentionally picking a move that is not the best. */
  randomness: number
  /** Centipawn tolerance used to build the randomised candidate pool. */
  slack: number
}

export interface SearchResult {
  from: string
  to: string
  promotion?: string
  san: string
  score: number
  depth: number
  nodes: number
}

interface SearchContext {
  deadline: number
  nodes: number
}

class TimeUpSignal extends Error {}

function pieceScore(symbol: string): number {
  return MATERIAL[symbol as keyof typeof MATERIAL] ?? 0
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => scoreMove(b) - scoreMove(a))
}

function scoreMove(move: Move): number {
  let score = 0
  if (move.captured) score += 10 * pieceScore(move.captured) - pieceScore(move.piece)
  if (move.promotion) score += pieceScore(move.promotion)
  return score
}

function checkTime(ctx: SearchContext): void {
  if ((ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) {
    throw new TimeUpSignal()
  }
}

function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  ply: number,
  qdepth: number,
  ctx: SearchContext,
): number {
  ctx.nodes++
  checkTime(ctx)

  const moves = game.moves({ verbose: true }) as Move[]
  if (moves.length === 0) {
    return game.inCheck() ? -(MATE - ply) : 0
  }

  const inCheck = game.inCheck()
  const standPat = sideScore(game)
  if (!inCheck) {
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  }

  if (qdepth <= 0 && !inCheck) return alpha

  const candidates = inCheck
    ? orderMoves(moves)
    : orderMoves(moves.filter((m) => m.captured || m.promotion))

  for (const move of candidates) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion })
    const score = -quiescence(game, -beta, -alpha, ply + 1, qdepth - 1, ctx)
    game.undo()
    if (score >= beta) return beta
    if (score > alpha) alpha = score
  }
  return alpha
}

function sideScore(game: Chess): number {
  return evaluate(game) * (game.turn() === 'w' ? 1 : -1)
}

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: SearchContext,
): number {
  ctx.nodes++
  checkTime(ctx)

  const moves = game.moves({ verbose: true }) as Move[]
  if (moves.length === 0) {
    return game.inCheck() ? -(MATE - ply) : 0
  }
  if (depth <= 0) {
    return quiescence(game, alpha, beta, ply, QUIESCENCE_MAX_DEPTH, ctx)
  }

  let best = -Infinity
  for (const move of orderMoves(moves)) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion })
    const score = -negamax(game, depth - 1, -beta, -alpha, ply + 1, ctx)
    game.undo()
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

interface RootScore {
  move: Move
  score: number
}

/**
 * Iterative-deepening alpha-beta search. Always returns a legal move if one
 * exists; if the time budget is exhausted mid-search the best result from the
 * last fully completed depth is used.
 */
export function findBestMove(
  fen: string,
  options: SearchOptions,
): SearchResult | null {
  const game = new Chess(fen)
  const rootMoves = game.moves({ verbose: true }) as Move[]
  if (rootMoves.length === 0) return null

  const toResult = (move: Move, score: number, depth: number, nodes: number): SearchResult => ({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    san: move.san,
    score,
    depth,
    nodes,
  })

  if (rootMoves.length === 1) {
    return toResult(rootMoves[0], 0, 0, 0)
  }

  const ctx: SearchContext = { deadline: Date.now() + options.timeMs, nodes: 0 }
  let bestMove: Move = rootMoves[0]
  let bestScore = 0
  let bestDepth = 0
  let rootScores: RootScore[] = rootMoves.map((move) => ({ move, score: 0 }))

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    try {
      const scored: RootScore[] = []
      let alpha = -Infinity
      let localBest: RootScore | null = null

      for (const move of orderMoves(rootMoves)) {
        game.move({ from: move.from, to: move.to, promotion: move.promotion })
        const score = -negamax(game, depth - 1, -Infinity, -alpha, 1, ctx)
        game.undo()
        scored.push({ move, score })
        if (!localBest || score > localBest.score) localBest = { move, score }
        if (score > alpha) alpha = score
      }

      if (localBest) {
        bestMove = localBest.move
        bestScore = localBest.score
        bestDepth = depth
        rootScores = scored
      }

      if (Math.abs(bestScore) > MATE - 1000) break
      if (Date.now() > ctx.deadline) break
    } catch (error) {
      if (error instanceof TimeUpSignal) break
      throw error
    }
  }

  let chosen = bestMove
  let chosenScore = bestScore
  if (options.randomness > 0 && rootScores.length > 1) {
    const pool = rootScores.filter((entry) => bestScore - entry.score <= options.slack)
    if (pool.length > 1 && Math.random() < options.randomness) {
      const pick = pool[Math.floor(Math.random() * pool.length)]
      chosen = pick.move
      chosenScore = pick.score
    }
  }

  return toResult(chosen, chosenScore, bestDepth, ctx.nodes)
}
