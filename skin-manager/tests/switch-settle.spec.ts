// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SkinCatalogEntry } from '../src/contract.ts'
import { activeSkins, isDesktopShell, waitForSkins } from '../src/client/switch-settle.ts'

const catalog: SkinCatalogEntry[] = [
  { id: 'maid-atelier', name: 'Maid', package: '@test/maid', wiringId: 'ui-skin-maid', bodyAttr: 'data-maid', order: 5 },
  { id: 'deepcel', name: 'Deepcel', package: '@test/deepcel', wiringId: 'ui-skin-deepcel', bodyAttr: 'data-deepcel', order: 10 },
]

afterEach(() => {
  vi.useRealTimers()
  for (const { name } of [...document.body.attributes]) document.body.removeAttribute(name)
})

describe('skin switch settling', () => {
  it('notices the first change once the Host starts applying a switch', async () => {
    document.body.setAttribute('data-maid', '')
    const before = activeSkins(catalog, document.body).join(',')
    const started = waitForSkins(catalog, active => active.join(',') !== before)
    // Unrelated body attributes are not a switch.
    document.body.setAttribute('data-other', '')
    document.body.removeAttribute('data-maid')
    await expect(started).resolves.toBe(true)
  })

  it('ignores the intermediate official frame when waiting for the requested skin', async () => {
    document.body.setAttribute('data-maid', '')
    const seen: string[][] = []
    const mounted = waitForSkins(catalog, (active) => {
      seen.push(active)
      return active.length === 1 && active[0] === 'deepcel'
    })
    document.body.removeAttribute('data-maid')
    await Promise.resolve()
    document.body.setAttribute('data-deepcel', '')
    await expect(mounted).resolves.toBe(true)
    expect(seen).toEqual([[], ['deepcel']])
  })

  it('reports a switch that never starts within the timeout', async () => {
    vi.useFakeTimers()
    const started = waitForSkins(catalog, () => true, document, 1000)
    vi.advanceTimersByTime(1000)
    await expect(started).resolves.toBe(false)
  })

  it('stops waiting when the switch request fails', async () => {
    const cancel = new AbortController()
    const started = waitForSkins(catalog, () => true, document, 60_000, cancel.signal)
    cancel.abort()
    await expect(started).resolves.toBe(false)
  })

  it('detects the desktop shell by its boot bridge', () => {
    expect(isDesktopShell({})).toBe(false)
    expect(isDesktopShell({ dshDesktopBoot: {} })).toBe(true)
  })
})
