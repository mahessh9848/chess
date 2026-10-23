import { Chess } from 'chess.js'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'
import type {
  BoardGrid,
  CapturedPieces,
  GameResult,
  PositionSnapshot,
} from './types'
import { START_FEN } from './types'
import { evaluate } from './ai/evaluate'

const ROOK_MOVES: Record<Color, { kingside: [Square, Square]; queenside: [Square, Square] }> = {
  w: { kingside: ['h1', 'f1'], queenside: ['a1', 'd1'] },
  b: { kingside: ['h8', 'f8'], queenside: ['a8', 'd8'] },
}

type IdMap = Map<string, string>

/**
 * Thin, UI-agnostic wrapper around chess.js.
 *
 * Adds two things the raw library lacks for a polished UI:
 *  - stable piece identity tracking, so pieces can be animated across moves
 *  - immutable-position snapshots for history navigation
 */
export class ChessEngine {
  private game: Chess
  private idStates: IdMap[]
  private idCounter: number
  private startFen: string
  private manualResult: GameResult | null = null

  constructor(fen: string = START_FEN) {
    this.startFen = fen
    this.game = new Chess(fen)
    this.idCounter = 0
    this.idStates = [this.buildInitialIds()]
  }

  private buildInitialIds(): IdMap {
    const ids: IdMap = new Map()
    for (const row of this.game.board()) {
      for (const cell of row) {
        if (cell) ids.set(cell.square, `p${this.idCounter++}`)
      }
    }
    return ids
  }

  private get currentIds(): IdMap {
    return this.idStates[this.idStates.length - 1]
  }

  reset(fen: string = this.startFen): void {
    this.startFen = fen
    this.game = new Chess(fen)
    this.idCounter = 0
    this.idStates = [this.buildInitialIds()]
    this.manualResult = null
  }

  setManualResult(result: GameResult): void {
    this.manualResult = result
  }

  clearManualResult(): void {
    this.manualResult = null
  }

  get turn(): Color {
    return this.game.turn()
  }

  get ply(): number {
    return this.idStates.length - 1
  }

  fen(): string {
    return this.game.fen()
  }

  moveNumber(): number {
    return this.game.moveNumber()
  }

  inCheck(): boolean {
    return this.game.inCheck()
  }

  /** Grid of the current position, with piece ids attached. */
  grid(): BoardGrid {
    const ids = this.currentIds
    return this.game.board().map((row) =>
      row.map((cell) =>
        cell
          ? {
              square: cell.square,
              type: cell.type,
              color: cell.color,
              id: ids.get(cell.square) ?? cell.square,
            }
          : null,
      ),
    )
  }

  legalMoves(square?: string): Move[] {
    return this.game.moves({ verbose: true, square: square as Square }) as Move[]
  }

  /** Returns the verbose legal move if it exists, without mutating state. */
  findMove(from: string, to: string, promotion?: PieceSymbol): Move | null {
    const candidates = this.game.moves({ verbose: true, square: from as Square }) as Move[]
    return (
      candidates.find(
        (m) =>
          m.to === to &&
          (!m.promotion || !promotion || m.promotion === promotion),
      ) ?? null
    )
  }

  move(
    from: string,
    to: string,
    promotion?: PieceSymbol,
  ): Move | null {
    let mv: Move
    try {
      mv = this.game.move({ from, to, promotion })
    } catch {
      return null
    }

    const ids = new Map(this.currentIds)
    const movingId = ids.get(from) ?? `p${this.idCounter++}`

    if (mv.isCapture()) {
      const capturedSquare = mv.isEnPassant() ? `${to[0]}${from[1]}` : to
      ids.delete(capturedSquare)
    }

    ids.delete(from)

    if (mv.isKingsideCastle() || mv.isQueensideCastle()) {
      const side = mv.isKingsideCastle() ? 'kingside' : 'queenside'
      const [rookFrom, rookTo] = ROOK_MOVES[mv.color][side]
      const rookId = ids.get(rookFrom)
      if (rookId) {
        ids.delete(rookFrom)
        ids.set(rookTo, rookId)
      }
    }

    ids.set(to, movingId)
    this.idStates.push(ids)
    return mv
  }

  undo(): Move | null {
    if (this.idStates.length <= 1) return null
    const mv = this.game.undo()
    if (!mv) return null
    this.idStates.pop()
    this.manualResult = null
    return mv
  }

  history(): Move[] {
    return this.game.history({ verbose: true }) as Move[]
  }

  capturedPieces(ply?: number): CapturedPieces {
    const result: CapturedPieces = { w: [], b: [] }
    const moves = this.history()
    const limit = ply !== undefined ? Math.max(0, Math.min(ply, moves.length)) : moves.length
    for (let i = 0; i < limit; i++) {
      const mv = moves[i]
      if (mv.captured) result[mv.color].push(mv.captured)
    }
    return result
  }

  isCheckmate(): boolean {
    return this.game.isCheckmate()
  }

  isStalemate(): boolean {
    return this.game.isStalemate()
  }

  isInsufficientMaterial(): boolean {
    return this.game.isInsufficientMaterial()
  }

  isThreefoldRepetition(): boolean {
    return this.game.isThreefoldRepetition()
  }

  isDrawByFiftyMoves(): boolean {
    return this.game.isDrawByFiftyMoves()
  }

  isGameOver(): boolean {
    return this.game.isGameOver()
  }

  /** Full game outcome, taking manual results (resign/timeout) into account first. */
  result(): GameResult {
    if (this.manualResult) return this.manualResult
    if (this.game.isCheckmate()) {
      return { over: true, winner: this.turn === 'w' ? 'b' : 'w', reason: 'checkmate' }
    }
    if (this.game.isStalemate()) {
      return { over: true, winner: null, reason: 'stalemate' }
    }
    if (this.game.isInsufficientMaterial()) {
      return { over: true, winner: null, reason: 'insufficient-material' }
    }
    if (this.game.isThreefoldRepetition()) {
      return { over: true, winner: null, reason: 'threefold-repetition' }
    }
    if (this.game.isDrawByFiftyMoves()) {
      return { over: true, winner: null, reason: 'fifty-move-rule' }
    }
    return { over: false, winner: null, reason: null }
  }

  /** Snapshot of the live position (no replay needed). */
  currentSnapshot(): PositionSnapshot {
    const moves = this.history()
    const last = moves.length > 0 ? moves[moves.length - 1] : null
    return {
      ply: this.ply,
      fen: this.game.fen(),
      grid: this.grid(),
      turn: this.game.turn(),
      lastMove: last ? { from: last.from, to: last.to } : null,
      check: this.game.inCheck(),
    }
  }

  /** Replays the game to an arbitrary ply and returns a renderable snapshot. */
  positionAt(ply: number): PositionSnapshot {
    const clamped = Math.max(0, Math.min(ply, this.ply))
    const replay = new Chess(this.startFen)
    const moves = this.history()
    for (let i = 0; i < clamped; i++) {
      const m = moves[i]
      replay.move({ from: m.from, to: m.to, promotion: m.promotion })
    }
    const ids = this.idStates[clamped]
    const grid: BoardGrid = replay.board().map((row) =>
      row.map((cell) =>
        cell
          ? {
              square: cell.square,
              type: cell.type,
              color: cell.color,
              id: ids.get(cell.square) ?? cell.square,
            }
          : null,
      ),
    )
    const last = clamped > 0 ? moves[clamped - 1] : null
    return {
      ply: clamped,
      fen: replay.fen(),
      grid,
      turn: replay.turn(),
      lastMove: last ? { from: last.from, to: last.to } : null,
      check: replay.inCheck(),
    }
  }

  /** SAN strings indexed by ply (0-based). */
  sans(): string[] {
    return this.game.history()
  }

  /** Returns PGN string for the full game. */
  pgn(): string {
    return this.game.pgn()
  }

  /** Loads an arbitrary position from FEN notation. */
  loadFen(fen: string): { ok: boolean; error?: string } {
    try {
      const test = new Chess(fen)
      this.startFen = fen
      this.game = test
      this.idCounter = 0
      this.idStates = [this.buildInitialIds()]
      this.manualResult = null
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid FEN' }
    }
  }

  /** Loads a game from PGN format. */
  loadPgn(pgn: string): { ok: boolean; error?: string } {
    try {
      const test = new Chess()
      test.loadPgn(pgn)
      this.reset()
      const historyMoves = test.history({ verbose: true })
      for (const m of historyMoves) {
        this.move(m.from, m.to, m.promotion)
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid PGN' }
    }
  }

  /** Static evaluation score in centipawns (positive = White leads). */
  evaluate(): number {
    return evaluate(this.game)
  }

  clone(): ChessEngine {
    const copy = new ChessEngine(this.startFen)
    for (const mv of this.history()) {
      copy.move(mv.from, mv.to, mv.promotion)
    }
    if (this.manualResult) copy.setManualResult(this.manualResult)
    return copy
  }
}
