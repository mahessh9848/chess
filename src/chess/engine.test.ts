import { describe, expect, it } from 'vitest'
import { ChessEngine } from './engine'
import type { PieceSymbol } from './types'

function pieceAt(engine: ChessEngine, square: string) {
  for (const row of engine.grid()) {
    for (const cell of row) {
      if (cell && cell.square === square) return cell
    }
  }
  return null
}

function play(engine: ChessEngine, moves: string[]): void {
  for (const move of moves) {
    const from = move.slice(0, 2)
    const to = move.slice(2, 4)
    const promotion = move.length > 4 ? (move[4] as PieceSymbol) : undefined
    const played = engine.move(from, to, promotion)
    expect(played, `expected ${move} to be legal`).not.toBeNull()
  }
}

describe('pawn movement', () => {
  it('allows single and double advances and rejects jumps', () => {
    const engine = new ChessEngine()
    expect(engine.findMove('e2', 'e3')).not.toBeNull()
    expect(engine.findMove('e2', 'e4')).not.toBeNull()
    expect(engine.findMove('e2', 'e5')).toBeNull()
    engine.move('e2', 'e4')
    expect(engine.turn).toBe('b')
    expect(engine.findMove('e7', 'e5')).not.toBeNull()
    expect(engine.findMove('e7', 'e6')).not.toBeNull()
    expect(engine.findMove('e7', 'e4')).toBeNull()
  })

  it('captures diagonally but not straight ahead', () => {
    const engine = new ChessEngine('rnbqkbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')
    expect(engine.findMove('e4', 'e5')).toBeNull()
    expect(engine.findMove('e4', 'd5')?.isCapture()).toBe(true)
  })
})

describe('piece movement', () => {
  it('moves knights in an L shape', () => {
    const engine = new ChessEngine()
    expect(engine.findMove('g1', 'f3')).not.toBeNull()
    expect(engine.findMove('g1', 'h3')).not.toBeNull()
    expect(engine.findMove('g1', 'e2')).toBeNull()
    expect(engine.findMove('g1', 'g3')).toBeNull()
  })

  it('moves bishops along diagonals only', () => {
    const engine = new ChessEngine('7k/8/8/3B4/8/8/8/K7 w - - 0 1')
    const moves = engine.legalMoves('d5').map((move) => move.to).sort()
    expect(moves).toEqual(['a2', 'a8', 'b3', 'b7', 'c4', 'c6', 'e4', 'e6', 'f3', 'f7', 'g2', 'g8', 'h1'])
  })

  it('moves rooks along files and ranks', () => {
    const engine = new ChessEngine('7k/8/8/3R4/8/8/8/K7 w - - 0 1')
    const moves = engine.legalMoves('d5').map((move) => move.to).sort()
    expect(moves).toEqual(['a5', 'b5', 'c5', 'd1', 'd2', 'd3', 'd4', 'd6', 'd7', 'd8', 'e5', 'f5', 'g5', 'h5'])
  })

  it('moves queens like a rook and bishop combined', () => {
    const engine = new ChessEngine('7k/8/8/3Q4/8/8/8/K7 w - - 0 1')
    expect(engine.legalMoves('d5')).toHaveLength(27)
  })

  it('moves the king one square in any direction', () => {
    const engine = new ChessEngine('8/8/8/8/8/8/8/4K2k w - - 0 1')
    expect(engine.legalMoves('e1').map((move) => move.to).sort()).toEqual(['d1', 'd2', 'e2', 'f1', 'f2'])
  })
})

describe('check, checkmate and stalemate', () => {
  it('detects check without checkmate', () => {
    const engine = new ChessEngine('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1')
    expect(engine.inCheck()).toBe(true)
    expect(engine.isCheckmate()).toBe(false)
  })

  it('detects checkmate (scholar’s mate)', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'])
    expect(engine.isCheckmate()).toBe(true)
    const result = engine.result()
    expect(result).toMatchObject({ over: true, winner: 'w', reason: 'checkmate' })
  })

  it('detects stalemate', () => {
    const engine = new ChessEngine('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(engine.isStalemate()).toBe(true)
    expect(engine.result()).toMatchObject({ over: true, winner: null, reason: 'stalemate' })
  })

  it('detects insufficient material', () => {
    const engine = new ChessEngine('8/8/8/8/8/8/6k1/K7 w - - 0 1')
    expect(engine.isInsufficientMaterial()).toBe(true)
    expect(engine.result().reason).toBe('insufficient-material')
  })

  it('detects threefold repetition', () => {
    const engine = new ChessEngine()
    play(engine, [
      'g1f3', 'g8f6', 'f3g1', 'f6g8',
      'g1f3', 'g8f6', 'f3g1', 'f6g8',
    ])
    expect(engine.isThreefoldRepetition()).toBe(true)
    expect(engine.result().reason).toBe('threefold-repetition')
  })
})

describe('special moves', () => {
  it('performs kingside and queenside castling and moves the rook', () => {
    const engine = new ChessEngine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const rookId = pieceAt(engine, 'h1')!.id
    const move = engine.move('e1', 'g1')
    expect(move?.isKingsideCastle()).toBe(true)
    expect(pieceAt(engine, 'g1')?.type).toBe('k')
    expect(pieceAt(engine, 'f1')?.id).toBe(rookId)

    const engine2 = new ChessEngine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const rookId2 = pieceAt(engine2, 'a1')!.id
    expect(engine2.move('e1', 'c1')?.isQueensideCastle()).toBe(true)
    expect(pieceAt(engine2, 'd1')?.id).toBe(rookId2)
  })

  it('does not allow castling through attacked squares', () => {
    const engine = new ChessEngine('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1')
    expect(engine.findMove('e1', 'g1')).toBeNull()
  })

  it('performs an en passant capture', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'a7a6', 'e4e5', 'd7d5'])
    const enPassant = engine.findMove('e5', 'd6')
    expect(enPassant?.isEnPassant()).toBe(true)
    expect(engine.move('e5', 'd6')).not.toBeNull()
    expect(pieceAt(engine, 'd5')).toBeNull()
    expect(pieceAt(engine, 'd6')?.color).toBe('w')
  })

  it('promotes to every piece type', () => {
    for (const promotion of ['q', 'r', 'b', 'n'] as PieceSymbol[]) {
      const engine = new ChessEngine('8/P7/8/8/8/8/8/K6k w - - 0 1')
      const move = engine.move('a7', 'a8', promotion)
      expect(move?.promotion).toBe(promotion)
      expect(pieceAt(engine, 'a8')?.type).toBe(promotion)
    }
  })
})

describe('engine integration', () => {
  it('rejects illegal moves without corrupting state', () => {
    const engine = new ChessEngine()
    expect(engine.move('e2', 'e5')).toBeNull()
    expect(engine.move('d1', 'd3')).toBeNull()
    expect(engine.move('e1', 'e2')).toBeNull()
    expect(engine.turn).toBe('w')
    expect(engine.ply).toBe(0)
  })

  it('matches known perft move counts', () => {
    const start = new ChessEngine()
    expect(start.legalMoves()).toHaveLength(20)

    const kiwipete = new ChessEngine(
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    )
    expect(kiwipete.legalMoves()).toHaveLength(48)
  })

  it('tracks piece identity and restores it on undo', () => {
    const engine = new ChessEngine()
    const beforeFen = engine.fen()
    const beforeGrid = JSON.stringify(engine.grid())
    engine.move('e2', 'e4')
    engine.undo()
    expect(engine.fen()).toBe(beforeFen)
    expect(JSON.stringify(engine.grid())).toBe(beforeGrid)
    expect(engine.turn).toBe('w')
  })

  it('reports captured pieces per side', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'd7d5', 'e4d5'])
    const captured = engine.capturedPieces()
    expect(captured.w).toEqual(['p'])
    expect(captured.b).toEqual([])
  })

  it('records algebraic notation and supports history replay', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'e7e5', 'g1f3'])
    expect(engine.sans()).toEqual(['e4', 'e5', 'Nf3'])
    const snapshot = engine.positionAt(1)
    expect(snapshot.grid.flat().filter(Boolean)).toHaveLength(32)
    expect(snapshot.turn).toBe('b')
    expect(snapshot.lastMove).toEqual({ from: 'e2', to: 'e4' })
  })

  it('resets to a fresh game', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'e7e5'])
    engine.reset()
    expect(engine.ply).toBe(0)
    expect(engine.turn).toBe('w')
    expect(engine.legalMoves()).toHaveLength(20)
  })

  it('calculates captured pieces at specific ply limits during history review', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5e5'])
    expect(engine.capturedPieces(2).w).toEqual([])
    expect(engine.capturedPieces(3).w).toEqual(['p'])
    expect(engine.capturedPieces(3).b).toEqual([])
    expect(engine.capturedPieces(4).b).toEqual(['p'])
  })

  it('exports valid PGN and loads PGN games', () => {
    const engine = new ChessEngine()
    play(engine, ['e2e4', 'e7e5', 'g1f3', 'b8c6'])
    const pgn = engine.pgn()
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6')

    const newEngine = new ChessEngine()
    const result = newEngine.loadPgn(pgn)
    expect(result.ok).toBe(true)
    expect(newEngine.ply).toBe(4)
    expect(newEngine.turn).toBe('w')
    expect(newEngine.sans()).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
  })

  it('loads custom FEN positions and rejects invalid FENs', () => {
    const engine = new ChessEngine()
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    const success = engine.loadFen(fen)
    expect(success.ok).toBe(true)
    expect(engine.turn).toBe('w')
    expect(engine.fen()).toBe(fen)

    const invalid = engine.loadFen('invalid fen string here')
    expect(invalid.ok).toBe(false)
    expect(invalid.error).toBeDefined()
  })

  it('computes evaluation score in centipawns', () => {
    const engine = new ChessEngine()
    expect(typeof engine.evaluate()).toBe('number')
    // Symmetric start position should be close to 0
    expect(Math.abs(engine.evaluate())).toBeLessThan(50)
  })
})
