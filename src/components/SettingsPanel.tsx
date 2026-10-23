import { useEffect } from 'react'
import { useSettings } from '../state/settingsContext'
import {
  BOARD_THEMES,
  PIECE_STYLES,
  type BoardTheme,
  type PieceStyle,
} from '../state/settingsConstants'
import { DIFFICULTY_LIST, type DifficultyLevel } from '../chess/ai/difficulty'
import { Piece } from './Piece'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, update, reset } = useSettings()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} role="presentation" />}
      <aside
        className={`drawer${open ? ' open' : ''}`}
        aria-hidden={!open}
        aria-label="Settings"
      >
        <div className="drawer-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <section className="settings-section">
            <h3>Board theme</h3>
            <div className="theme-grid">
              {BOARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-swatch swatch-${theme.id}${
                    settings.boardTheme === theme.id ? ' active' : ''
                  }`}
                  onClick={() => update({ boardTheme: theme.id as BoardTheme })}
                  aria-pressed={settings.boardTheme === theme.id}
                >
                  <span className="swatch-preview" aria-hidden="true">
                    <span className="sw-light" />
                    <span className="sw-dark" />
                  </span>
                  {theme.name}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>Piece style</h3>
            <div className="piece-styles" data-piece-preview={settings.pieceStyle}>
              {PIECE_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`piece-style${
                    settings.pieceStyle === style.id ? ' active' : ''
                  }`}
                  onClick={() => update({ pieceStyle: style.id as PieceStyle })}
                  aria-pressed={settings.pieceStyle === style.id}
                  data-style={style.id}
                >
                  <span className="piece-preview">
                    <Piece color="w" type="n" />
                    <Piece color="b" type="k" />
                  </span>
                  {style.name}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>Gameplay</h3>
            <Toggle
              label="Highlight legal moves"
              checked={settings.highlightLegal}
              onChange={(value) => update({ highlightLegal: value })}
            />
            <Toggle
              label="Highlight last move"
              checked={settings.highlightLast}
              onChange={(value) => update({ highlightLast: value })}
            />
            <Toggle
              label="Board coordinates"
              checked={settings.showCoordinates}
              onChange={(value) => update({ showCoordinates: value })}
            />
            <Toggle
              label="Animations"
              description="Smooth piece movement"
              checked={settings.animations}
              onChange={(value) => update({ animations: value })}
            />
            <Toggle
              label="Evaluation bar"
              description="Real-time position balance"
              checked={settings.showEvalBar}
              onChange={(value) => update({ showEvalBar: value })}
            />
            <Toggle
              label="Auto-promote to queen"
              checked={settings.autoPromote}
              onChange={(value) => update({ autoPromote: value })}
            />
          </section>

          <section className="settings-section">
            <h3>Sound</h3>
            <Toggle
              label="Sound effects"
              checked={settings.soundEnabled}
              onChange={(value) => update({ soundEnabled: value })}
            />
            <label className="range-field">
              <span className="toggle-label">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(event) =>
                  update({ volume: Number(event.target.value) / 100 })
                }
                aria-label="Volume"
              />
            </label>
          </section>

          <section className="settings-section">
            <h3>Default engine strength</h3>
            <label className="select-field">
              <select
                value={settings.difficulty}
                onChange={(event) =>
                  update({ difficulty: Number(event.target.value) as DifficultyLevel })
                }
              >
                {DIFFICULTY_LIST.map((preset) => (
                  <option key={preset.level} value={preset.level}>
                    {preset.name} (~{preset.rating})
                  </option>
                ))}
              </select>
            </label>
          </section>

          <button type="button" className="btn btn-block" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </aside>
    </>
  )
}
