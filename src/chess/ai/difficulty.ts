import type { SearchOptions } from './search'

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export interface DifficultyPreset extends SearchOptions {
  level: DifficultyLevel
  name: string
  description: string
  /** Rough Elo used for display only. */
  rating: number
}

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyPreset> = {
  1: {
    level: 1,
    name: 'Beginner',
    description: 'Sees one move ahead and often slips.',
    rating: 600,
    maxDepth: 1,
    timeMs: 150,
    randomness: 0.8,
    slack: 220,
  },
  2: {
    level: 2,
    name: 'Casual',
    description: 'Looks a couple of moves ahead.',
    rating: 1000,
    maxDepth: 2,
    timeMs: 350,
    randomness: 0.45,
    slack: 130,
  },
  3: {
    level: 3,
    name: 'Club',
    description: 'Solid tactical play, rare mistakes.',
    rating: 1400,
    maxDepth: 3,
    timeMs: 900,
    randomness: 0.12,
    slack: 60,
  },
  4: {
    level: 4,
    name: 'Advanced',
    description: 'Deep search with quiescence.',
    rating: 1750,
    maxDepth: 4,
    timeMs: 2200,
    randomness: 0,
    slack: 0,
  },
  5: {
    level: 5,
    name: 'Master',
    description: 'Strongest setting, thinks longest.',
    rating: 2100,
    maxDepth: 5,
    timeMs: 4500,
    randomness: 0,
    slack: 0,
  },
}

export const DIFFICULTY_LIST: DifficultyPreset[] = [1, 2, 3, 4, 5].map(
  (level) => DIFFICULTIES[level as DifficultyLevel],
)
