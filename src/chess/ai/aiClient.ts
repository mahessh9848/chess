import type { SearchOptions, SearchResult } from './search'
import type { AiRequest, AiResponse } from './worker'

interface PendingRequest {
  resolve: (move: SearchResult | null) => void
  reject: (error: Error) => void
}

/**
 * Promisified wrapper around the AI web worker.
 *
 * The worker is created lazily and re-created on demand so a transient
 * termination (for example React StrictMode's mount/unmount cycle) never
 * leaves the engine unusable. Callers should still handle rejection, which is
 * what happens when workers are unavailable in the current environment.
 */
export class AiClient {
  private worker: Worker | null = null
  private sequence = 0
  private pending = new Map<number, PendingRequest>()

  private createWorker(): Worker | null {
    try {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (event: MessageEvent<AiResponse>) => {
        const { id, move, error } = event.data
        const request = this.pending.get(id)
        if (!request) return
        this.pending.delete(id)
        if (error) request.reject(new Error(error))
        else request.resolve(move)
      }
      worker.onerror = () => {
        this.failAll(new Error('AI worker crashed'))
        if (this.worker === worker) this.worker = null
      }
      return worker
    } catch {
      return null
    }
  }

  get available(): boolean {
    if (!this.worker) this.worker = this.createWorker()
    return this.worker !== null
  }

  think(fen: string, options: SearchOptions): Promise<SearchResult | null> {
    if (!this.worker) this.worker = this.createWorker()
    const worker = this.worker
    if (!worker) return Promise.reject(new Error('AI worker is not available'))

    const id = ++this.sequence
    const request: AiRequest = { id, fen, options }
    return new Promise<SearchResult | null>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      worker.postMessage(request)
    })
  }

  private failAll(error: Error): void {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }

  dispose(): void {
    this.failAll(new Error('AI client disposed'))
    this.worker?.terminate()
    this.worker = null
  }
}
