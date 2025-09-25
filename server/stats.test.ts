// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./analytics.js', () => {
  return {
    phCountCoverLetters: vi.fn().mockResolvedValue({ total: 17 })
  }
})

import { buildStatsResponse } from './server.js'
import { phCountCoverLetters } from './analytics.js'

describe('stats endpoint contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns total and env', async () => {
    ;(phCountCoverLetters as any).mockResolvedValueOnce({ total: 123 })
    const r = await buildStatsResponse()
    expect(r.code).toBe(200)
    expect(r.data.total).toBe(123)
    // Default test env is development
    expect(r.data.env).toMatch(/development|production/)
  })
})

