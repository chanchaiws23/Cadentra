import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')

describe('production hardening', () => {
  it('ships restrictive web security headers', () => {
    const headers = readProjectFile('apps/web/public/_headers')
    expect(headers).toContain("default-src 'self'")
    expect(headers).toContain("frame-ancestors 'none'")
    expect(headers).toContain('X-Content-Type-Options: nosniff')
  })

  it('disables Android cleartext traffic and device backup', () => {
    const manifest = readProjectFile('apps/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('android:usesCleartextTraffic="false"')
    expect(manifest).toContain('android:allowBackup="false"')
  })

  it('supports keyboard bypass and reduced motion', () => {
    expect(readProjectFile('apps/web/src/App.tsx')).toContain('href="#main-content"')
    expect(readProjectFile('apps/web/src/App.css')).toContain('prefers-reduced-motion:reduce')
  })
})
