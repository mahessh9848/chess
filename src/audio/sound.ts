export type SoundEvent =
  | 'move'
  | 'capture'
  | 'castle'
  | 'check'
  | 'promote'
  | 'gameStart'
  | 'gameEnd'
  | 'illegal'

interface Tone {
  freq: number
  duration: number
  type: OscillatorType
  gain: number
  delay: number
  sweepTo?: number
}

const RECIPES: Record<SoundEvent, Tone[]> = {
  move: [{ freq: 320, duration: 0.09, type: 'triangle', gain: 0.5, delay: 0 }],
  capture: [
    { freq: 210, duration: 0.13, type: 'square', gain: 0.32, delay: 0 },
    { freq: 140, duration: 0.16, type: 'triangle', gain: 0.35, delay: 0.03 },
  ],
  castle: [
    { freq: 300, duration: 0.08, type: 'triangle', gain: 0.4, delay: 0 },
    { freq: 380, duration: 0.1, type: 'triangle', gain: 0.4, delay: 0.08 },
  ],
  check: [
    { freq: 660, duration: 0.12, type: 'sine', gain: 0.4, delay: 0 },
    { freq: 880, duration: 0.16, type: 'sine', gain: 0.35, delay: 0.1 },
  ],
  promote: [
    { freq: 520, duration: 0.1, type: 'sine', gain: 0.4, delay: 0 },
    { freq: 660, duration: 0.1, type: 'sine', gain: 0.4, delay: 0.08 },
    { freq: 880, duration: 0.18, type: 'sine', gain: 0.4, delay: 0.16 },
  ],
  gameStart: [
    { freq: 440, duration: 0.12, type: 'triangle', gain: 0.35, delay: 0 },
    { freq: 660, duration: 0.18, type: 'triangle', gain: 0.35, delay: 0.12 },
  ],
  gameEnd: [
    { freq: 520, duration: 0.16, type: 'sine', gain: 0.4, delay: 0 },
    { freq: 392, duration: 0.18, type: 'sine', gain: 0.4, delay: 0.16 },
    { freq: 262, duration: 0.3, type: 'sine', gain: 0.42, delay: 0.34 },
  ],
  illegal: [
    { freq: 180, duration: 0.12, type: 'sawtooth', gain: 0.24, delay: 0, sweepTo: 120 },
  ],
}

/** Lightweight WebAudio synthesiser so the app ships without audio assets. */
export class SoundPlayer {
  private context: AudioContext | null = null
  private enabled = true
  private volume = 0.6
  private failed = false

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
  }

  private ensureContext(): AudioContext | null {
    if (this.failed) return null
    if (this.context) return this.context
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) {
        this.failed = true
        return null
      }
      this.context = new Ctor()
      return this.context
    } catch {
      this.failed = true
      return null
    }
  }

  play(event: SoundEvent): void {
    if (!this.enabled || this.volume === 0) return
    const context = this.ensureContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()

    const now = context.currentTime
    for (const tone of RECIPES[event]) {
      try {
        this.playTone(context, tone, now)
      } catch {
        this.failed = true
        return
      }
    }
  }

  private playTone(context: AudioContext, tone: Tone, now: number): void {
    const start = now + tone.delay
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = tone.type
    oscillator.frequency.setValueAtTime(tone.freq, start)
    if (tone.sweepTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, tone.sweepTo),
        start + tone.duration,
      )
    }
    const peak = tone.gain * this.volume
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + tone.duration + 0.02)
  }
}

export const soundPlayer = new SoundPlayer()
