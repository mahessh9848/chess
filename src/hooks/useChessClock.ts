import { useCallback, useEffect, useRef, useState } from 'react'
import type { Color } from '../chess/types'

export interface ClockSnapshot {
  w: number
  b: number
  increment: number
  active: Color | null
  running: boolean
  unlimited: boolean
}

export interface ClockApi {
  snapshot: ClockSnapshot
  configure: (initial: number, increment: number) => void
  start: (color: Color) => void
  switchTo: (color: Color, addIncrementTo: Color) => void
  pause: () => void
  resume: () => void
  addTime: (color: Color, seconds: number) => void
}

const EMPTY: ClockSnapshot = {
  w: 0,
  b: 0,
  increment: 0,
  active: null,
  running: false,
  unlimited: true,
}

/** Chess clock with Fischer increments. Ticks on a timer and reports flag falls. */
export function useChessClock(onTimeout: (color: Color) => void): ClockApi {
  const timesRef = useRef({ w: 0, b: 0 })
  const metaRef = useRef({
    increment: 0,
    active: null as Color | null,
    running: false,
    unlimited: true,
    lastTs: 0,
  })
  const [snapshot, setSnapshot] = useState<ClockSnapshot>(EMPTY)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const publish = useCallback(() => {
    const meta = metaRef.current
    setSnapshot({
      w: timesRef.current.w,
      b: timesRef.current.b,
      increment: meta.increment,
      active: meta.active,
      running: meta.running,
      unlimited: meta.unlimited,
    })
  }, [])

  useEffect(() => {
    if (!snapshot.running || !snapshot.active || snapshot.unlimited) return
    metaRef.current.lastTs = performance.now()
    const tick = () => {
      const meta = metaRef.current
      const active = meta.active
      if (!active || !meta.running) return
      const now = performance.now()
      const elapsed = (now - meta.lastTs) / 1000
      meta.lastTs = now
      const next = Math.max(0, timesRef.current[active] - elapsed)
      timesRef.current = { ...timesRef.current, [active]: next }
      publish()
      if (next <= 0) {
        meta.running = false
        onTimeoutRef.current(active)
      }
    }
    const id = window.setInterval(tick, 100)
    return () => window.clearInterval(id)
  }, [snapshot.running, snapshot.active, snapshot.unlimited, publish])

  const configure = useCallback(
    (initial: number, increment: number) => {
      const unlimited = initial <= 0
      timesRef.current = { w: initial, b: initial }
      metaRef.current = {
        increment,
        active: null,
        running: false,
        unlimited,
        lastTs: 0,
      }
      publish()
    },
    [publish],
  )

  const start = useCallback(
    (color: Color) => {
      const meta = metaRef.current
      if (meta.unlimited) return
      meta.active = color
      meta.running = true
      meta.lastTs = performance.now()
      publish()
    },
    [publish],
  )

  const switchTo = useCallback(
    (color: Color, addIncrementTo: Color) => {
      const meta = metaRef.current
      if (meta.unlimited) return
      timesRef.current = {
        ...timesRef.current,
        [addIncrementTo]: timesRef.current[addIncrementTo] + meta.increment,
      }
      meta.active = color
      meta.running = true
      meta.lastTs = performance.now()
      publish()
    },
    [publish],
  )

  const pause = useCallback(() => {
    if (!metaRef.current.running) return
    metaRef.current.running = false
    publish()
  }, [publish])

  const resume = useCallback(() => {
    const meta = metaRef.current
    if (meta.unlimited || !meta.active) return
    meta.running = true
    meta.lastTs = performance.now()
    publish()
  }, [publish])

  const addTime = useCallback(
    (color: Color, seconds: number) => {
      timesRef.current = {
        ...timesRef.current,
        [color]: Math.max(0, timesRef.current[color] + seconds),
      }
      publish()
    },
    [publish],
  )

  return { snapshot, configure, start, switchTo, pause, resume, addTime }
}
