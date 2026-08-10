import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

describe('responsive workspace styles', () => {
  it('stacks wide workspaces before the sidebar constrains their content', () => {
    expect(css).toContain('@media(max-width:1200px)')
    expect(css).toContain('.today-grid{grid-template-columns:1fr}')
    expect(css).toContain('.insights-grid{grid-template-columns:1fr}')
  })

  it('uses the drawer layout and fluid content on tablet and mobile widths', () => {
    expect(css).toContain('@media(max-width:820px)')
    expect(css).toContain('body{margin:0;min-width:0')
    expect(css).toContain('.scrim{position:fixed;inset:0 0 0 236px')
    expect(css).toContain('.calendar-board{width:100%;min-width:0}')
    expect(css).toContain('.streak-row{grid-template-columns:80px minmax(0,1fr) 45px;gap:8px}')
  })
})
