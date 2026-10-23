import { Piece } from './Piece'
import type { Color, PieceSymbol } from '../chess/types'

const ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p']

interface CapturedPiecesProps {
  pieces: PieceSymbol[]
  color: Color
  advantage: number
}

export function CapturedPieces({ pieces, color, advantage }: CapturedPiecesProps) {
  const sorted = [...pieces].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  return (
    <div
      className="captured"
      aria-label={`Captured pieces: ${sorted.join(', ') || 'none'}`}
    >
      {sorted.map((type, index) => (
        <span className="captured-piece" key={`${type}-${index}`}>
          <Piece color={color} type={type} />
        </span>
      ))}
      {advantage > 0 && <span className="material-advantage">+{advantage}</span>}
    </div>
  )
}
