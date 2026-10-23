import { findBestMove } from './search'
import type { SearchOptions, SearchResult } from './search'

export interface AiRequest {
  id: number
  fen: string
  options: SearchOptions
}

export interface AiResponse {
  id: number
  move: SearchResult | null
  error?: string
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AiRequest>) => void) | null
  postMessage: (message: AiResponse) => void
}

scope.onmessage = (event) => {
  const { id, fen, options } = event.data
  try {
    scope.postMessage({ id, move: findBestMove(fen, options) })
  } catch (error) {
    scope.postMessage({
      id,
      move: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
