import { useEffect, useState } from 'react'
import { useGame } from '../state/gameContext'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
}

type Tab = 'export' | 'import'

function ShareModal({ onClose }: { onClose: () => void }) {
  const { snapshot, pgn, loadFen, loadPgn } = useGame()
  const [tab, setTab] = useState<Tab>('export')
  const [copiedType, setCopiedType] = useState<'fen' | 'pgn' | null>(null)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = async (type: 'fen' | 'pgn', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    }
  }

  const handleDownloadPgn = () => {
    const blob = new Blob([pgn || '[Event "Casual Game"]\n\n*'], {
      type: 'application/x-chess-pgn',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gambit-chess-${new Date().toISOString().slice(0, 10)}.pgn`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    setImportError(null)
    setImportSuccess(null)
    const text = importText.trim()
    if (!text) {
      setImportError('Please enter a valid FEN or PGN string.')
      return
    }

    // Try FEN first: FEN has multiple tokens and slashes
    const fenTokens = text.split(/\s+/)
    if (fenTokens.length >= 2 && fenTokens.length <= 6 && text.includes('/')) {
      const result = loadFen(text)
      if (result.ok) {
        setImportSuccess('Position successfully loaded!')
        setTimeout(() => onClose(), 800)
        return
      }
    }

    // Next try PGN
    const pgnResult = loadPgn(text)
    if (pgnResult.ok) {
      setImportSuccess('Game successfully loaded!')
      setTimeout(() => onClose(), 800)
      return
    }

    setImportError(pgnResult.error || 'Failed to parse FEN or PGN. Please verify the notation.')
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal share-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export or import game"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Share & Import</h2>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="segmented share-tabs">
          <button
            type="button"
            className={`segment${tab === 'export' ? ' active' : ''}`}
            onClick={() => {
              setTab('export')
              setImportError(null)
            }}
          >
            Export / Copy
          </button>
          <button
            type="button"
            className={`segment${tab === 'import' ? ' active' : ''}`}
            onClick={() => setTab('import')}
          >
            Import FEN / PGN
          </button>
        </div>

        {tab === 'export' ? (
          <div className="share-content">
            <div className="share-section">
              <div className="share-section-header">
                <h3>Current FEN</h3>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleCopy('fen', snapshot.fen)}
                >
                  {copiedType === 'fen' ? '✓ Copied' : 'Copy FEN'}
                </button>
              </div>
              <code className="share-code">{snapshot.fen}</code>
            </div>

            <div className="share-section">
              <div className="share-section-header">
                <h3>PGN (Move History)</h3>
                <div className="share-buttons">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleCopy('pgn', pgn || '*')}
                  >
                    {copiedType === 'pgn' ? '✓ Copied' : 'Copy PGN'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleDownloadPgn}
                  >
                    Download .pgn
                  </button>
                </div>
              </div>
              <textarea
                className="share-textarea"
                readOnly
                value={pgn || 'No moves yet in this game.'}
                rows={4}
              />
            </div>
          </div>
        ) : (
          <div className="share-content">
            <p className="share-hint">
              Paste a <strong>FEN string</strong> (for custom board setup) or <strong>PGN notation</strong> (to load and replay an entire game).
            </p>
            <textarea
              className="share-textarea import-textarea"
              placeholder="e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1&#10;or [Event &quot;Casual Game&quot;] 1. e4 e5 ..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
            />
            {importError && <p className="import-feedback error">{importError}</p>}
            {importSuccess && <p className="import-feedback success">{importSuccess}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                Load position / game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  if (!open) return null
  return <ShareModal onClose={onClose} />
}
