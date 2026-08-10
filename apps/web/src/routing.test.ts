import { describe, expect, it } from 'vitest'
import { pathToView, viewPaths } from './routing'

describe('application routes', () => {
  it('maps every public workspace path back to its view', () => {
    for (const [view, path] of Object.entries(viewPaths)) {
      expect(pathToView(path)).toBe(view)
    }
  })

  it('does not treat unknown paths as a valid workspace', () => {
    expect(pathToView('/not-a-view')).toBeUndefined()
  })
})
