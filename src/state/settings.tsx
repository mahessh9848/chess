import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type Settings } from './settingsConstants'
import { SettingsContext } from './settingsContext'

const STORAGE_KEY = 'chess.settings.v1'

function sanitize(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  const input = raw as Partial<Settings>
  const settings = { ...DEFAULT_SETTINGS, ...input }
  settings.volume = Math.min(1, Math.max(0, Number(settings.volume) || 0))
  return settings
}

function load(): Settings {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS
    return sanitize(JSON.parse(stored))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Persistence is best-effort; ignore quota/security errors.
    }
  }, [settings])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.board = settings.boardTheme
    root.dataset.piece = settings.pieceStyle
  }, [settings.boardTheme, settings.pieceStyle])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => sanitize({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const value = useMemo(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}
