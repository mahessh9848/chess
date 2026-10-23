import { useMemo, useState } from 'react'
import { useGame } from '../state/gameContext'
import { useSettings } from '../state/settingsContext'
import { TIME_CONTROLS, UNLIMITED } from '../state/timeControls'
import { DIFFICULTY_LIST, type DifficultyLevel } from '../chess/ai/difficulty'
import type { Color, GameMode, TimeControl } from '../chess/types'

interface NewGameDialogProps {
  open: boolean
  onClose: () => void
}

const MODE_OPTIONS: { id: GameMode; label: string; hint: string }[] = [
  { id: 'pvp', label: 'Player vs Player', hint: 'Two players, one device' },
  { id: 'pvc', label: 'Player vs Computer', hint: 'Play the built-in engine' },
  { id: 'cvc', label: 'Computer vs Computer', hint: 'Watch the engines duel' },
]

type ColorChoice = 'w' | 'b' | 'random'

function presetKey(control: TimeControl): string {
  if (control.label === UNLIMITED.label) return 'unlimited'
  return `${control.initial}+${control.increment}`
}

function NewGameModal({ onClose }: { onClose: () => void }) {
  const { mode: currentMode, humanColor, timeControl, difficulty, newGame } = useGame()
  const { update } = useSettings()

  const [mode, setMode] = useState<GameMode>(currentMode)
  const [colorChoice, setColorChoice] = useState<ColorChoice>(humanColor)
  const [level, setLevel] = useState<DifficultyLevel>(difficulty)
  const [preset, setPreset] = useState<string>(() => presetKey(timeControl))
  const [customMinutes, setCustomMinutes] = useState(10)
  const [customIncrement, setCustomIncrement] = useState(0)

  const allPresets = useMemo(() => [UNLIMITED, ...TIME_CONTROLS], [])

  const start = () => {
    let control = UNLIMITED
    if (preset !== 'unlimited') {
      if (preset === 'custom') {
        control = {
          initial: Math.max(0, Math.round(customMinutes * 60)),
          increment: Math.max(0, Math.round(customIncrement)),
          label: `${customMinutes}+${customIncrement} Custom`,
        }
      } else {
        control = allPresets.find((entry) => presetKey(entry) === preset) ?? UNLIMITED
      }
    }
    const resolvedColor: Color =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    newGame({ mode, humanColor: resolvedColor, timeControl: control, difficulty: level })
    update({ difficulty: level })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal new-game-modal"
        role="dialog"
        aria-modal="true"
        aria-label="New game"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>New game</h2>

        <section className="field-group">
          <span className="field-label">Game mode</span>
          <div className="segmented">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`segment${mode === option.id ? ' active' : ''}`}
                onClick={() => setMode(option.id)}
                aria-pressed={mode === option.id}
                title={option.hint}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {mode === 'pvc' && (
          <section className="field-group">
            <span className="field-label">Play as</span>
            <div className="segmented">
              {(['w', 'b', 'random'] as ColorChoice[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`segment${colorChoice === choice ? ' active' : ''}`}
                  onClick={() => setColorChoice(choice)}
                  aria-pressed={colorChoice === choice}
                >
                  {choice === 'w' ? 'White' : choice === 'b' ? 'Black' : 'Random'}
                </button>
              ))}
            </div>
          </section>
        )}

        {mode !== 'pvp' && (
          <section className="field-group">
            <span className="field-label">Engine strength</span>
            <div className="difficulty-list">
              {DIFFICULTY_LIST.map((presetItem) => (
                <button
                  key={presetItem.level}
                  type="button"
                  className={`difficulty-item${level === presetItem.level ? ' active' : ''}`}
                  onClick={() => setLevel(presetItem.level)}
                  aria-pressed={level === presetItem.level}
                >
                  <span className="difficulty-name">{presetItem.name}</span>
                  <span className="difficulty-rating">~{presetItem.rating}</span>
                  <span className="difficulty-desc">{presetItem.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="field-group">
          <span className="field-label">Time control</span>
          <div className="time-controls">
            {allPresets.map((control) => {
              const key = presetKey(control)
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip${preset === key ? ' active' : ''}`}
                  onClick={() => setPreset(key)}
                  aria-pressed={preset === key}
                >
                  {control.label}
                </button>
              )
            })}
            <button
              type="button"
              className={`chip${preset === 'custom' ? ' active' : ''}`}
              onClick={() => setPreset('custom')}
              aria-pressed={preset === 'custom'}
            >
              Custom
            </button>
          </div>
          {preset === 'custom' && (
            <div className="custom-time">
              <label>
                Minutes
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(Number(event.target.value))}
                />
              </label>
              <label>
                Increment (s)
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={customIncrement}
                  onChange={(event) => setCustomIncrement(Number(event.target.value))}
                />
              </label>
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={start}>
            Start game
          </button>
        </div>
      </div>
    </div>
  )
}

export function NewGameDialog({ open, onClose }: NewGameDialogProps) {
  if (!open) return null
  return <NewGameModal onClose={onClose} />
}
