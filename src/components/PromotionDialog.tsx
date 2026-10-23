import { useEffect, useRef } from 'react'
import { Piece } from './Piece'
import { useGame } from '../state/gameContext'
import type { PieceSymbol } from '../chess/types'
import { soundPlayer } from '../audio/sound'

const CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n']

export function PromotionDialog() {
  const { pendingPromotion, confirmPromotion, cancelPromotion } = useGame()
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pendingPromotion) firstRef.current?.focus()
  }, [pendingPromotion])

  useEffect(() => {
    if (!pendingPromotion) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelPromotion()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingPromotion, cancelPromotion])

  if (!pendingPromotion) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={cancelPromotion}>
      <div
        className="modal promotion-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a promotion piece"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Promote pawn</h2>
        <p className="modal-subtitle">Choose the piece your pawn becomes.</p>
        <div className="promotion-choices">
          {CHOICES.map((type, index) => (
            <button
              key={type}
              ref={index === 0 ? firstRef : undefined}
              type="button"
              className="promotion-choice"
              onClick={() => {
                soundPlayer.play('promote')
                confirmPromotion(type)
              }}
              aria-label={`Promote to ${type}`}
            >
              <Piece color={pendingPromotion.color} type={type} />
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={cancelPromotion}>
          Cancel
        </button>
      </div>
    </div>
  )
}
