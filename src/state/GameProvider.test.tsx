// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { GameProvider } from './GameProvider'
import { useGame } from './gameContext'
import { SettingsProvider } from './settings'
import { UNLIMITED } from './timeControls'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <GameProvider>{children}</GameProvider>
    </SettingsProvider>
  )
}

function setup() {
  return renderHook(() => useGame(), { wrapper })
}

describe('game controller', () => {
  it('plays legal moves and switches turns in Player vs Player', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    expect(result.current.turn).toBe('w')

    act(() => {
      result.current.onDrop('e2', 'e4')
    })
    expect(result.current.sans).toEqual(['e4'])
    expect(result.current.turn).toBe('b')

    act(() => {
      result.current.onDrop('e7', 'e5')
    })
    expect(result.current.sans).toEqual(['e4', 'e5'])
  })

  it('ignores illegal moves', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => {
      result.current.onDrop('e2', 'e5')
    })
    expect(result.current.sans).toEqual([])
    expect(result.current.turn).toBe('w')
  })

  it('supports click-to-select and click-to-move with highlighted targets', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => result.current.onSquareClick('e2'))
    expect(result.current.selected).toBe('e2')
    expect(result.current.targets.map((move) => move.to)).toContain('e4')

    act(() => result.current.onSquareClick('e4'))
    expect(result.current.selected).toBeNull()
    expect(result.current.sans).toEqual(['e4'])
  })

  it('undoes moves', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => result.current.onDrop('d2', 'd4'))
    act(() => result.current.onDrop('d7', 'd5'))
    expect(result.current.sans).toEqual(['d4', 'd5'])
    act(() => result.current.undo())
    expect(result.current.sans).toEqual(['d4'])
    expect(result.current.turn).toBe('b')
  })

  it('ends the game on resignation', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => result.current.resign('w'))
    expect(result.current.result).toMatchObject({
      over: true,
      winner: 'b',
      reason: 'resignation',
    })
  })

  it('restarts cleanly', () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => result.current.onDrop('e2', 'e4'))
    act(() =>
      result.current.newGame({
        mode: 'pvp',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    expect(result.current.sans).toEqual([])
    expect(result.current.turn).toBe('w')
  })

  it('makes a legal computer reply in Player vs Computer even without workers', async () => {
    const { result } = setup()
    act(() =>
      result.current.newGame({
        mode: 'pvc',
        humanColor: 'w',
        timeControl: UNLIMITED,
        difficulty: 1,
      }),
    )
    act(() => {
      result.current.onDrop('e2', 'e4')
    })
    await waitFor(() => expect(result.current.sans.length).toBe(2), {
      timeout: 4000,
    })
    expect(result.current.turn).toBe('w')
  })
})
