// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Ensure env points to dev variants
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.POSTHOG_DEV_PROJECT_KEY = 'phc_test'
process.env.POSTHOG_DEV_PROJECT_ID = '42'
process.env.POSTHOG_DEV_PERSONAL_API_KEY = 'phx_dev'

// Import after setting env so module captures it
import { phCapture, phCountCoverLetters, __resetStatsCache } from './analytics.js'

describe('server analytics helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    __resetStatsCache()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('phCapture posts to ingestion with api_key and distinct id', async () => {
    const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(new Response('{}', { status: 200 }))
    await phCapture({ event: 'cover_letter_generated', properties: { channel: 'server' }, distinct_id: 'abc' })
    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/https:\/\/.*i\.posthog\.com\/capture\//)
    const body = JSON.parse(String((init as any).body || '{}'))
    expect(body.api_key).toBe('phc_test')
    expect(body.event).toBe('cover_letter_generated')
    expect(body.distinct_id).toBe('abc')
    expect(body.properties.channel).toBe('server')
  })

  it('phCountCoverLetters queries HogQL and caches result', async () => {
    const payload = { results: [[7]] }
    const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const r1 = await phCountCoverLetters()
    expect(r1.total).toBe(7)
    const r2 = await phCountCoverLetters()
    expect(r2.total).toBe(7)
    // Only one network call due to cache
    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/https:\/\/.*posthog\.com\/api\/projects\/42\/query\//)
    const hdrs = (init as any).headers || {}
    expect(hdrs.Authorization).toMatch(/^Bearer phx_dev/)
  })
})

