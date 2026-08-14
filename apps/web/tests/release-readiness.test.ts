import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const projectUrl = (path: string) => new URL(`../../../${path}`, import.meta.url)

function jpegDimensions(bytes: Buffer) {
  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1]
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) }
    }
    offset += 2 + bytes.readUInt16BE(offset + 2)
  }
  throw new Error('JPEG dimensions not found')
}

describe('V1 release readiness', () => {
  it('ships correctly sized Play Store assets', () => {
    const icon = readFileSync(projectUrl('assets/store/play-icon-512.png'))
    expect(icon.readUInt32BE(16)).toBe(512)
    expect(icon.readUInt32BE(20)).toBe(512)
    expect(icon[25]).toBe(6)
    expect(jpegDimensions(readFileSync(projectUrl('assets/store/feature-graphic-1024x500.jpg')))).toEqual({ width: 1024, height: 500 })
  })

  it('targets API 36 and prepares a signed AAB workflow', () => {
    expect(readFileSync(projectUrl('apps/android/variables.gradle'), 'utf8')).toContain('targetSdkVersion = 36')
    const workflow = readFileSync(projectUrl('.github/workflows/release-candidate.yml'), 'utf8')
    expect(workflow).toContain('bundleRelease')
    expect(workflow).toContain('ANDROID_UPLOAD_KEYSTORE_BASE64')
    expect(workflow).toContain('app-release.aab')
  })

  it('publishes privacy and account deletion instructions', () => {
    expect(readFileSync(projectUrl('apps/web/public/privacy.html'), 'utf8')).toContain('/delete-account.html')
    expect(readFileSync(projectUrl('apps/web/public/delete-account.html'), 'utf8')).toContain('Settings')
  })
})
