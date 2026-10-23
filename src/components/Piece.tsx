import { PIECE_SVG } from '../chess/pieceSvg'
import type { Color, PieceSymbol } from '../chess/types'

interface PieceProps {
  color: Color
  type: PieceSymbol
  className?: string
}

/** Crisp, scalable chess piece rendered from embedded Cburnett SVG artwork. */
export function Piece({ color, type, className }: PieceProps) {
  const markup = PIECE_SVG[color + type]
  if (!markup) return null
  return (
    <svg
      className={className ? `piece ${className}` : 'piece'}
      viewBox="0 0 45 45"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
