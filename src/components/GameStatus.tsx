import { useGame } from '../state/gameContext'
import { resultText } from '../chess/format'
import type { Color } from '../chess/types'

interface GameStatusProps {
  names: Record<Color, string>
}

export function GameStatus({ names }: GameStatusProps) {
  const { result, turn, inCheck, aiThinking, mode, viewPly, livePly } = useGame()

  const viewing = viewPly !== null && viewPly !== livePly
  let text: string
  let tone: 'neutral' | 'check' | 'over' = 'neutral'

  if (result.over) {
    text = resultText(result, names)
    tone = 'over'
  } else if (viewing) {
    text = `Reviewing move ${viewPly} of ${livePly}`
  } else if (inCheck) {
    text = `${names[turn]} is in check`
    tone = 'check'
  } else if (aiThinking && mode !== 'pvp') {
    text = `${names[turn]} is thinking…`
  } else {
    text = `${names[turn]} to move`
  }

  return (
    <div className={`status status-${tone}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <span className="status-text">{text}</span>
    </div>
  )
}
