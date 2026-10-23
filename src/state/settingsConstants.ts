import type { DifficultyLevel } from '../chess/ai/difficulty'

export type BoardTheme = 'classic' | 'emerald' | 'ocean' | 'slate' | 'plum'
export type PieceStyle = 'classic' | 'ivory' | 'midnight' | 'walnut'

export interface Settings {
  boardTheme: BoardTheme
  pieceStyle: PieceStyle
  soundEnabled: boolean
  volume: number
  animations: boolean
  highlightLegal: boolean
  highlightLast: boolean
  showCoordinates: boolean
  autoPromote: boolean
  difficulty: DifficultyLevel
  showEvalBar: boolean
}

export const BOARD_THEMES: { id: BoardTheme; name: string }[] = [
  { id: 'classic', name: 'Classic Brown' },
  { id: 'emerald', name: 'Tournament Green' },
  { id: 'ocean', name: 'Ocean Blue' },
  { id: 'slate', name: 'Graphite' },
  { id: 'plum', name: 'Plum' },
]

export const PIECE_STYLES: { id: PieceStyle; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'ivory', name: 'Ivory & Rosewood' },
  { id: 'midnight', name: 'Midnight' },
  { id: 'walnut', name: 'Walnut' },
]

export const DEFAULT_SETTINGS: Settings = {
  boardTheme: 'emerald',
  pieceStyle: 'classic',
  soundEnabled: true,
  volume: 0.6,
  animations: true,
  highlightLegal: true,
  highlightLast: true,
  showCoordinates: true,
  autoPromote: false,
  difficulty: 3,
  showEvalBar: true,
}
