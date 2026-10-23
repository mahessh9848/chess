import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PieceSymbol } from 'chess.js'
import { ChessEngine } from '../chess/engine'
import type {
  Color,
  GameMode,
  Move,
  TimeControl,
} from '../chess/types'
import { DIFFICULTIES, type DifficultyLevel } from '../chess/ai/difficulty'
import type { SearchResult } from '../chess/ai/search'
import { AiClient } from '../chess/ai/aiClient'
import { soundPlayer } from '../audio/sound'
import { UNLIMITED } from './timeControls'
import { useChessClock, type ClockSnapshot } from '../hooks/useChessClock'
import { useSettings } from './settingsContext'
import {
  GameContext,
  type GameContextValue,
  type NewGameConfig,
} from './gameContext'

export { type NewGameConfig } from './gameContext'

export function GameProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()

  const engineRef = useRef<ChessEngine | null>(null)
  if (!engineRef.current) engineRef.current = new ChessEngine()
  const engine = engineRef.current

  const [version, setVersion] = useState(0)
  const [mode, setMode] = useState<GameMode>('pvc')
  const [humanColor, setHumanColor] = useState<Color>('w')
  const [timeControl, setTimeControl] = useState<TimeControl>(UNLIMITED)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(settings.difficulty)
  const [viewPly, setViewPly] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<
    { from: string; to: string; color: Color } | null
  >(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)

  const aiClientRef = useRef<AiClient | null>(null)
  if (!aiClientRef.current) aiClientRef.current = new AiClient()
  const aiBusyRef = useRef(false)

  const clockRef = useRef<ClockSnapshot | null>(null)
  const handleTimeout = useCallback((color: Color) => {
    const engineInstance = engineRef.current
    if (!engineInstance) return
    engineInstance.setManualResult({
      over: true,
      winner: color === 'w' ? 'b' : 'w',
      reason: 'timeout',
    })
    soundPlayer.play('gameEnd')
    setVersion((value) => value + 1)
  }, [])

  const clock = useChessClock(handleTimeout)
  clockRef.current = clock.snapshot

  const livePly = engine.ply
  const isLive = viewPly === null || viewPly === livePly

  // The engine lives in a ref (it is mutable and must not trigger renders on
  // its own), so `version` is the explicit invalidation counter for every
  // derived value below.
  /* eslint-disable react-hooks/exhaustive-deps */
  const snapshot = useMemo(
    () => (isLive ? engine.currentSnapshot() : engine.positionAt(viewPly as number)),
    [isLive, viewPly, version],
  )

  const result = useMemo(() => engine.result(), [version])
  const moves = useMemo(() => engine.history(), [version])
  const sans = useMemo(() => engine.sans(), [version])
  const captured = useMemo(
    () => (isLive ? engine.capturedPieces() : engine.capturedPieces(viewPly as number)),
    [isLive, viewPly, version],
  )
  const pgn = useMemo(() => engine.pgn(), [version])
  const evalScore = useMemo(() => engine.evaluate(), [version])

  const targets = useMemo(
    () => (selected && isLive ? engine.legalMoves(selected) : []),
    [selected, isLive, version],
  )
  /* eslint-enable react-hooks/exhaustive-deps */

  const turn = snapshot.turn
  const inCheck = snapshot.check && !result.over

  const humanTurn =
    mode === 'pvp' ? true : mode === 'pvc' ? turn === humanColor : false
  const interactive = isLive && !result.over && humanTurn && !aiThinking

  useEffect(() => {
    soundPlayer.setEnabled(settings.soundEnabled)
    soundPlayer.setVolume(settings.volume)
  }, [settings.soundEnabled, settings.volume])

  const playMoveSound = useCallback((mv: Move) => {
    if (engine.result().over) {
      soundPlayer.play('gameEnd')
      return
    }
    if (mv.isKingsideCastle() || mv.isQueensideCastle()) soundPlayer.play('castle')
    else if (mv.promotion) soundPlayer.play('promote')
    else if (mv.isCapture()) soundPlayer.play('capture')
    else soundPlayer.play('move')

    if (engine.inCheck()) {
      window.setTimeout(() => soundPlayer.play('check'), 80)
    }
  }, [engine])

  const afterMove = useCallback(
    (mv: Move) => {
      setVersion((value) => value + 1)
      setSelected(null)
      setViewPly(null)
      setPendingPromotion(null)
      playMoveSound(mv)
      if (engine.result().over) {
        clock.pause()
      } else {
        clock.switchTo(engine.turn, mv.color)
      }
    },
    [engine, clock, playMoveSound],
  )

  const applyMove = useCallback(
    (from: string, to: string, promotion?: PieceSymbol): boolean => {
      const mv = engine.move(from, to, promotion)
      if (!mv) {
        soundPlayer.play('illegal')
        return false
      }
      afterMove(mv)
      return true
    },
    [engine, afterMove],
  )

  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      if (!interactive) return false
      const candidate = engine.findMove(from, to)
      if (!candidate) return false
      if (candidate.promotion) {
        if (settings.autoPromote) return applyMove(from, to, 'q')
        setPendingPromotion({ from, to, color: candidate.color })
        return true
      }
      return applyMove(from, to)
    },
    [interactive, engine, settings.autoPromote, applyMove],
  )

  const onSquareClick = useCallback(
    (square: string) => {
      if (!interactive) return
      const piece = snapshot.grid
        .flat()
        .find((cell) => cell && cell.square === square)
      if (selected) {
        if (square === selected) {
          setSelected(null)
          return
        }
        const isTarget = targets.some((move) => move.to === square)
        if (isTarget) {
          tryMove(selected, square)
          return
        }
        if (piece && piece.color === turn) {
          setSelected(square)
          return
        }
        setSelected(null)
        return
      }
      if (piece && piece.color === turn) {
        setSelected(square)
      }
    },
    [interactive, snapshot.grid, selected, targets, tryMove, turn],
  )

  const onDrop = useCallback(
    (from: string, to: string) => tryMove(from, to),
    [tryMove],
  )

  const confirmPromotion = useCallback(
    (type: PieceSymbol) => {
      if (!pendingPromotion) return
      applyMove(pendingPromotion.from, pendingPromotion.to, type)
    },
    [pendingPromotion, applyMove],
  )

  const cancelPromotion = useCallback(() => setPendingPromotion(null), [])

  const newGame = useCallback(
    (config: NewGameConfig) => {
      engine.reset()
      setMode(config.mode)
      setHumanColor(config.humanColor)
      setTimeControl(config.timeControl)
      setDifficulty(config.difficulty)
      setSelected(null)
      setPendingPromotion(null)
      setViewPly(null)
      setFlipped(config.mode === 'pvc' && config.humanColor === 'b')
      setAutoPlay(true)
      clock.configure(config.timeControl.initial, config.timeControl.increment)
      if (config.timeControl.initial > 0) clock.start('w')
      soundPlayer.play('gameStart')
      setVersion((value) => value + 1)
    },
    [engine, clock],
  )

  const loadFen = useCallback(
    (fen: string) => {
      const res = engine.loadFen(fen)
      if (!res.ok) return res
      setSelected(null)
      setPendingPromotion(null)
      setViewPly(null)
      clock.configure(timeControl.initial, timeControl.increment)
      if (timeControl.initial > 0) clock.start(engine.turn)
      soundPlayer.play('gameStart')
      setVersion((value) => value + 1)
      return res
    },
    [engine, clock, timeControl],
  )

  const loadPgn = useCallback(
    (pgnStr: string) => {
      const res = engine.loadPgn(pgnStr)
      if (!res.ok) return res
      setSelected(null)
      setPendingPromotion(null)
      setViewPly(null)
      clock.configure(timeControl.initial, timeControl.increment)
      if (timeControl.initial > 0) clock.start(engine.turn)
      soundPlayer.play('gameStart')
      setVersion((value) => value + 1)
      return res
    },
    [engine, clock, timeControl],
  )

  const undo = useCallback(() => {
    if (engine.ply === 0) return
    engine.clearManualResult()
    engine.undo()
    if (mode === 'pvc' && engine.ply > 0 && engine.turn !== humanColor) {
      engine.undo()
    }
    setSelected(null)
    setPendingPromotion(null)
    setViewPly(null)
    setVersion((value) => value + 1)
  }, [engine, mode, humanColor])

  const resign = useCallback(
    (color: Color) => {
      engine.setManualResult({
        over: true,
        winner: color === 'w' ? 'b' : 'w',
        reason: 'resignation',
      })
      clock.pause()
      soundPlayer.play('gameEnd')
      setVersion((value) => value + 1)
    },
    [engine, clock],
  )

  const claimDraw = useCallback(() => {
    engine.setManualResult({
      over: true,
      winner: null,
      reason: 'agreement',
    })
    clock.pause()
    soundPlayer.play('gameEnd')
    setVersion((value) => value + 1)
  }, [engine, clock])

  const goToPly = useCallback(
    (ply: number | null) => {
      setSelected(null)
      setViewPly(ply === null || ply >= engine.ply ? null : Math.max(0, ply))
    },
    [engine],
  )

  // Keep the clock in step with game state: run only while live and unfinished.
  useEffect(() => {
    if (timeControl.initial <= 0 || clock.snapshot.unlimited) return
    if (isLive && !result.over) clock.resume()
    else clock.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, result.over, timeControl.initial, version])

  // Drive the engine's own moves for Player-vs-Computer and Computer-vs-Computer.
  useEffect(() => {
    if (result.over || !isLive || aiBusyRef.current) return
    const color = engine.turn
    const isAiTurn =
      mode === 'pvc' ? color !== humanColor : mode === 'cvc' ? autoPlay : false
    if (!isAiTurn) return

    let cancelled = false
    const preset = DIFFICULTIES[difficulty]
    const fen = engine.fen()
    aiBusyRef.current = true
    setAiThinking(true)

    const run = async () => {
      let move: SearchResult | null = null
      try {
        move = await aiClientRef.current!.think(fen, preset)
      } catch {
        const legal = engine.legalMoves()
        move = legal.length
          ? { ...legal[Math.floor(Math.random() * legal.length)], score: 0, depth: 0, nodes: 0 } as SearchResult
          : null
      }
      if (cancelled) return
      aiBusyRef.current = false
      setAiThinking(false)
      if (move) {
        const played = engine.move(
          move.from,
          move.to,
          move.promotion as PieceSymbol | undefined,
        )
        if (played) afterMove(played)
      }
    }

    const timer = window.setTimeout(run, 220)
    return () => {
      cancelled = true
      aiBusyRef.current = false
      window.clearTimeout(timer)
      setAiThinking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, mode, humanColor, difficulty, result.over, isLive, autoPlay])

  useEffect(() => {
    return () => aiClientRef.current?.dispose()
  }, [])

  const value: GameContextValue = {
    mode,
    humanColor,
    timeControl,
    difficulty,
    snapshot,
    grid: snapshot.grid,
    livePly,
    viewPly,
    isLive,
    turn,
    inCheck,
    result,
    moves,
    sans,
    captured,
    selected,
    targets,
    interactive,
    aiThinking,
    pendingPromotion,
    clock: clock.snapshot,
    flipped,
    autoPlay,
    pgn,
    evalScore,
    onSquareClick,
    onDrop,
    confirmPromotion,
    cancelPromotion,
    newGame,
    loadFen,
    loadPgn,
    undo,
    resign,
    claimDraw,
    goToPly,
    setFlipped,
    setAutoPlay,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
