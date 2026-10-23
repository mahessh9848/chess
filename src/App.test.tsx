import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('App shell', () => {
  it('renders a full board with 64 squares and the starting 32 pieces', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html.match(/data-square=/g)?.length).toBe(64)
    expect(html.match(/class="piece-layer/g)?.length).toBe(32)
  })

  it('renders the primary controls and player information', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('New game')
    expect(html).toContain('Undo')
    expect(html).toContain('Resign')
    expect(html).toContain('Player vs Computer')
    expect(html).toContain('to move')
  })

  it('renders the piece artwork as inline SVG rather than text glyphs', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="0 0 45 45"')
  })
})
