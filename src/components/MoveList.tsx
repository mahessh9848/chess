import { useEffect, useMemo, useRef } from 'react'
import { useGame } from '../state/gameContext'
import { resultText } from '../chess/format'
import type { Color } from '../chess/types'

interface MoveListProps {
  names: Record<Color, string>
}

interface MoveRow {
  number: number
  white?: { san: string; ply: number }
  black?: { san: string; ply: number }
}

export function MoveList({ names }: MoveListProps) {
  const { sans, livePly, viewPly, goToPly, isLive, result } = useGame()
  const listRef = useRef<HTMLDivElement>(null)
  const currentPly = viewPly ?? livePly

  const rows = useMemo(() => {
    const result: MoveRow[] = []
    for (let index = 0; index < sans.length; index += 2) {
      result.push({
        number: index / 2 + 1,
        white: { san: sans[index], ply: index + 1 },
        black: sans[index + 1]
          ? { san: sans[index + 1], ply: index + 2 }
          : undefined,
      })
    }
    return result
  }, [sans])

  useEffect(() => {
    const active = listRef.current?.querySelector('.move-active')
    active?.scrollIntoView({ block: 'nearest' })
  }, [currentPly, sans.length])

  const renderMove = (move: { san: string; ply: number } | undefined) => {
    if (!move) return <span className="move-empty">—</span>
    const active = move.ply === currentPly
    return (
      <button
        type="button"
        className={`move${active ? ' move-active' : ''}`}
        onClick={() => goToPly(move.ply)}
        aria-current={active ? 'step' : undefined}
      >
        {move.san}
      </button>
    )
  }

  return (
    <div className="movelist-panel">
      <div className="panel-heading">
        <h2>Moves</h2>
        {!isLive && (
          <button type="button" className="link-btn" onClick={() => goToPly(null)}>
            back to live
          </button>
        )}
      </div>
      <div className="movelist" ref={listRef} tabIndex={0} aria-label="Move history">
        {rows.length === 0 && <p className="movelist-empty">No moves yet.</p>}
        {rows.map((row) => (
          <div className="move-row" key={row.number}>
            <span className="move-number">{row.number}.</span>
            <span className="move-cell">{renderMove(row.white)}</span>
            <span className="move-cell">{renderMove(row.black)}</span>
          </div>
        ))}
        {result.over && (
          <div className="move-result">{resultText(result, names)}</div>
        )}
      </div>
    </div>
  )
}
