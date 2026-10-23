import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Piece } from './Piece'
import { useGame } from '../state/gameContext'
import { useSettings } from '../state/settingsContext'
import type { BoardCell } from '../chess/types'

const FILES = 'abcdefgh'

function squareName(displayRow: number, displayCol: number, flipped: boolean): string {
  const file = flipped ? 7 - displayCol : displayCol
  const rank = flipped ? displayRow : 7 - displayRow
  return `${FILES[file]}${rank + 1}`
}

function displayCoords(
  square: string,
  flipped: boolean,
): { row: number; col: number } {
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1]) - 1
  return {
    row: flipped ? rank : 7 - rank,
    col: flipped ? 7 - file : file,
  }
}

interface DragState {
  from: string
  x: number
  y: number
  active: boolean
}

export function Board() {
  const {
    grid,
    turn,
    flipped,
    selected,
    targets,
    interactive,
    snapshot,
    onSquareClick,
    onDrop,
  } = useGame()
  const { settings } = useSettings()
  const boardRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [focusSquare, setFocusSquare] = useState('e1')
  const pointerRef = useRef<{
    id: number
    from: string
    x: number
    y: number
    activated: boolean
  } | null>(null)

  const pieceMap = useMemo(() => {
    const map = new Map<string, BoardCell>()
    for (const row of grid) {
      for (const cell of row) {
        if (cell) map.set(cell.square, cell)
      }
    }
    return map
  }, [grid])

  const targetMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const move of targets) map.set(move.to, Boolean(move.captured))
    return map
  }, [targets])

  const checkSquare = useMemo(() => {
    if (!snapshot.check) return null
    for (const row of grid) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === snapshot.turn) return cell.square
      }
    }
    return null
  }, [grid, snapshot.check, snapshot.turn])

  const squareFromPoint = useCallback(
    (clientX: number, clientY: number): string | null => {
      const board = boardRef.current
      if (!board) return null
      const rect = board.getBoundingClientRect()
      const col = Math.floor(((clientX - rect.left) / rect.width) * 8)
      const row = Math.floor(((clientY - rect.top) / rect.height) * 8)
      if (col < 0 || col > 7 || row < 0 || row > 7) return null
      return squareName(row, col, flipped)
    },
    [flipped],
  )

  const localPoint = useCallback((clientX: number, clientY: number) => {
    const board = boardRef.current
    if (!board) return { x: 0, y: 0 }
    const rect = board.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const square = squareFromPoint(event.clientX, event.clientY)
      if (!square) return
      setFocusSquare(square)

      const piece = pieceMap.get(square)
      const canDrag = Boolean(interactive && piece && piece.color === turn)

      if (canDrag) {
        pointerRef.current = {
          id: event.pointerId,
          from: square,
          x: event.clientX,
          y: event.clientY,
          activated: false,
        }
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Pointer capture can fail for synthetic/untrusted pointers; dragging
          // still works while the pointer stays over the board.
        }
      }
      onSquareClick(square)
    },
    [squareFromPoint, pieceMap, interactive, turn, onSquareClick],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointer = pointerRef.current
      if (!pointer || pointer.id !== event.pointerId) return
      if (!pointer.activated) {
        const moved = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
        if (moved < 6) return
        pointer.activated = true
      }
      const { x, y } = localPoint(event.clientX, event.clientY)
      setDrag({ from: pointer.from, x, y, active: true })
    },
    [localPoint],
  )

  const endPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointer = pointerRef.current
      pointerRef.current = null
      setDrag(null)
      if (!pointer || !pointer.activated) return
      const square = squareFromPoint(event.clientX, event.clientY)
      if (square && square !== pointer.from) onDrop(pointer.from, square)
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // Ignore capture bookkeeping failures.
      }
    },
    [squareFromPoint, onDrop],
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const moveFocus = (dRow: number, dCol: number) => {
        const { row, col } = displayCoords(focusSquare, flipped)
        const nextRow = Math.max(0, Math.min(7, row + dRow))
        const nextCol = Math.max(0, Math.min(7, col + dCol))
        setFocusSquare(squareName(nextRow, nextCol, flipped))
      }
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          moveFocus(flipped ? 1 : -1, 0)
          break
        case 'ArrowDown':
          event.preventDefault()
          moveFocus(flipped ? -1 : 1, 0)
          break
        case 'ArrowLeft':
          event.preventDefault()
          moveFocus(0, flipped ? 1 : -1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveFocus(0, flipped ? -1 : 1)
          break
        case 'Home':
          event.preventDefault()
          setFocusSquare('a1')
          break
        case 'End':
          event.preventDefault()
          setFocusSquare('h8')
          break
        case 'Enter':
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          onSquareClick(focusSquare)
          break
        case 'Escape':
          event.preventDefault()
          onSquareClick(selected ?? focusSquare)
          break
        default:
          break
      }
    },
    [focusSquare, flipped, onSquareClick, selected],
  )

  const squares = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = squareName(row, col, flipped)
      const file = FILES.indexOf(square[0])
      const rank = Number(square[1]) - 1
      const light = (file + rank) % 2 === 1
      const piece = pieceMap.get(square)
      const isTarget = targetMap.has(square)
      const isCapture = targetMap.get(square) === true
      const classes = ['square', light ? 'light' : 'dark']
      if (piece) classes.push(`has-${piece.color}`)
      if (settings.highlightLast && snapshot.lastMove) {
        if (square === snapshot.lastMove.from || square === snapshot.lastMove.to) {
          classes.push('last-move')
        }
      }
      if (square === selected) classes.push('selected')
      if (square === checkSquare) classes.push('in-check')
      if (square === focusSquare) classes.push('focused')
      if (interactive && isTarget && settings.highlightLegal) {
        classes.push(isCapture ? 'target-capture' : 'target')
      }
      squares.push(
        <div
          key={square}
          className={classes.join(' ')}
          data-square={square}
          aria-hidden="true"
        />,
      )
    }
  }

  const pieces = []
  for (const row of grid) {
    for (const cell of row) {
      if (!cell) continue
      const { row: dRow, col: dCol } = displayCoords(cell.square, flipped)
      const hidden = drag?.active && drag.from === cell.square
      pieces.push(
        <div
          key={cell.id}
          className={`piece-layer${hidden ? ' is-dragging' : ''}`}
          style={{
            transform: `translate(${dCol * 100}%, ${dRow * 100}%)`,
            transition: settings.animations ? undefined : 'none',
          }}
        >
          <Piece color={cell.color} type={cell.type} />
        </div>,
      )
    }
  }

  const hints = []
  if (interactive && settings.highlightLegal) {
    for (const [square, capture] of targetMap) {
      const { row, col } = displayCoords(square, flipped)
      hints.push(
        <div
          key={square}
          className={`hint ${capture ? 'hint-capture' : 'hint-dot'}`}
          style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
        />,
      )
    }
  }

  const dragPiece = drag?.active ? pieceMap.get(drag.from) : null

  return (
    <div className="board-shell">
      <div
        ref={boardRef}
        className={interactive ? 'board is-interactive' : 'board'}
        role="grid"
        aria-label={`Chess board. ${
          turn === 'w' ? 'White' : 'Black'
        } to move. Use arrow keys to navigate and Enter to select or move.`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={handleKeyDown}
        data-flipped={flipped}
      >
        <div className="squares">{squares}</div>
        <div className="pieces">{pieces}</div>
        <div className="hints">{hints}</div>
        {dragPiece && drag && (
          <div
            className="drag-ghost"
            style={{ left: `${drag.x}%`, top: `${drag.y}%` }}
          >
            <Piece color={dragPiece.color} type={dragPiece.type} />
          </div>
        )}
        {settings.showCoordinates && (
          <>
            <div className="coords coords-files" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => {
                const file = flipped ? 7 - index : index
                return <span key={file}>{FILES[file]}</span>
              })}
            </div>
            <div className="coords coords-ranks" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => {
                const rank = flipped ? index + 1 : 8 - index
                return <span key={rank}>{rank}</span>
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
