import { useGame } from '../state/gameContext'
import { useSettings } from '../state/settingsContext'
import { evalToPercentage, formatEval } from '../chess/format'

export function EvalBar() {
  const { evalScore, flipped, result } = useGame()
  const { settings } = useSettings()

  if (!settings.showEvalBar) return null

  // If game is over with a checkmate winner:
  let displayScore = evalScore
  if (result.over && result.winner) {
    displayScore = result.winner === 'w' ? 100_000 : -100_000
  } else if (result.over && !result.winner) {
    displayScore = 0
  }

  const whitePercent = evalToPercentage(displayScore)
  const formatted = formatEval(displayScore)

  // When board is flipped (Black at bottom), Black's advantage is at the bottom:
  const heightStyle = flipped ? `${100 - whitePercent}%` : `${whitePercent}%`
  const fillClass = flipped ? 'eval-fill-black' : 'eval-fill-white'

  return (
    <div
      className="eval-bar-container"
      title={`Evaluation: ${formatted} pawns`}
      aria-label={`Position evaluation: ${formatted}`}
    >
      <div className="eval-bar-track">
        <div
          className={`eval-bar-fill ${fillClass}`}
          style={{ height: heightStyle }}
        />
      </div>
      <div className={`eval-bar-label ${displayScore >= 0 ? 'eval-white' : 'eval-black'}`}>
        {formatted}
      </div>
    </div>
  )
}
