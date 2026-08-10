import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('Tailwind foundation', () => {
  it('loads Tailwind through the Vite plugin and global stylesheet', () => {
    const viteConfig = readProjectFile('vite.config.ts')
    const stylesheet = readProjectFile('src/index.css')

    expect(viteConfig).toContain("import tailwindcss from '@tailwindcss/vite'")
    expect(viteConfig).toContain('tailwindcss()')
    expect(viteConfig).toContain("name: 'supabase-vendor'")
    expect(stylesheet).toContain("@import 'tailwindcss'")
    expect(stylesheet).toContain('--color-accent: #246b50')
    expect(stylesheet).toContain('--font-display:')
  })

  it('uses Tailwind utilities in shared UI', () => {
    const pageHeading = readProjectFile('src/components/PageHeading.tsx')

    expect(pageHeading).toContain('max-[820px]:flex-col')
    expect(pageHeading).toContain('font-display')
    expect(pageHeading).not.toContain('className="page-heading"')
  })
})
