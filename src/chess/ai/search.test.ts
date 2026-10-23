import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { findBestMove } from './search'
import { DIFFICULTY_LIST } from './difficulty'

function legalTargets(fen: string): Set<string> {
  const game = new Chess(fen)
  return new Set(game.moves().map((san) => san))
}

const OPTIONS = { maxDepth: 2, timeMs: 1500, randomness: 0, slack: 0 }

describe('AI search', () => {
  it('returns null when there are no legal moves', () => {
    const checkmated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(findBestMove(checkmated, OPTIONS)).toBeNull()
  })

  it('finds a mate in one', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1'
    const move = findBestMove(fen, { ...OPTIONS, maxDepth: 3 })
    expect(move).not.toBeNull()
    expect(`${move!.from}${move!.to}`).toBe('e1e8')
    expect(move!.score).toBeGreaterThan(90000)
  })

  it('always returns a legal move on the starting position', () => {
    const start = new Chess().fen()
    const legal = legalTargets(start)
    const move = findBestMove(start, OPTIONS)
    expect(move).not.toBeNull()
    expect(legal.has(move!.san)).toBe(true)
  })

  it('produces legal moves at every difficulty level', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const legal = legalTargets(fen)
    for (const preset of DIFFICULTY_LIST) {
      const move = findBestMove(fen, { ...preset, timeMs: 500 })
      expect(move, `level ${preset.level}`).not.toBeNull()
      expect(legal.has(move!.san), `level ${preset.level}`).toBe(true)
    }
  }, 20000)

  it('respects a tight time budget and still returns quickly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const start = Date.now()
    const move = findBestMove(fen, { maxDepth: 8, timeMs: 300, randomness: 0, slack: 0 })
    const elapsed = Date.now() - start
    expect(move).not.toBeNull()
    expect(elapsed).toBeLessThan(4000)
  })

  it('captures a free queen', () => {
    const fen = '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1'
    const move = findBestMove(fen, { maxDepth: 3, timeMs: 1500, randomness: 0, slack: 0 })
    expect(`${move!.from}${move!.to}`).toBe('d1d5')
  })
})
