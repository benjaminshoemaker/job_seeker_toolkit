import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'

vi.mock('../lib/analytics', () => ({
  getDistinctId: vi.fn(),
  trackCoverLetterGeneratedDevOnly: vi.fn(),
}))

import { CoverLetterGenerator } from './CoverLetterGenerator'
import { getDistinctId, trackCoverLetterGeneratedDevOnly } from '../lib/analytics'

function fillResumePaste(value: string) {
  fireEvent.click(screen.getByRole('button', { name: /paste resume text/i }))
  const box = screen.getByPlaceholderText(/paste your resume content here/i)
  fireEvent.change(box, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
}

function fillJDPaste(value: string) {
  fireEvent.click(screen.getByRole('button', { name: /paste job description/i }))
  const box = screen.getByPlaceholderText(/paste the job description here/i)
  fireEvent.change(box, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
}

describe('CoverLetterGenerator analytics integration', () => {
  beforeEach(() => {
    // @ts-expect-error test polyfill
    global.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds x-ph-distinct-id header and tracks client event in dev', async () => {
    ;(getDistinctId as any).mockReturnValue('abc123')
    const fetchMock = vi.spyOn(global, 'fetch' as any).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input)
      if (url.includes('/api/cover-letter/generate')) {
        expect((init?.headers as any)['x-ph-distinct-id']).toBe('abc123')
        return new Response(JSON.stringify({ letter: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('{}', { status: 200 })
    })

    render(<CoverLetterGenerator onBack={() => {}} />)
    fillResumePaste('R')
    fillJDPaste('J')
    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }))

    await screen.findByDisplayValue('ok')
    expect(fetchMock).toHaveBeenCalled()
    expect(trackCoverLetterGeneratedDevOnly).toHaveBeenCalledTimes(1)
  })

  it('omits x-ph-distinct-id header when no id', async () => {
    ;(getDistinctId as any).mockReturnValue(undefined)
    const fetchMock = vi.spyOn(global, 'fetch' as any).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input)
      if (url.includes('/api/cover-letter/generate')) {
        const headers = (init?.headers || {}) as Record<string, string>
        for (const key of Object.keys(headers)) {
          expect(key.toLowerCase()).not.toBe('x-ph-distinct-id')
        }
        return new Response(JSON.stringify({ letter: 'ok2' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('{}', { status: 200 })
    })

    render(<CoverLetterGenerator onBack={() => {}} />)
    fillResumePaste('R')
    fillJDPaste('J')
    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }))

    await screen.findByDisplayValue('ok2')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('does not track analytics when JD metadata error is returned', async () => {
    ;(getDistinctId as any).mockReturnValue('abc123')
    const errorMessage =
      'Could not identify the company name or role title from the job description. Please add this information at the top of the job description using this format:\n\nCompany: [Company Name]\nRole: [Role Title]\n\n[Rest of job description]'

    vi.spyOn(global, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'INSUFFICIENT_JD_METADATA', message: errorMessage }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    )

    render(<CoverLetterGenerator onBack={() => {}} />)
    fillResumePaste('Resume text')
    fillJDPaste('Job description text')
    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }))

    const output = await screen.findByDisplayValue((value: string) =>
      value.includes('Could not identify the company name or role title')
    )
    expect(output).toBeDefined()
    expect(trackCoverLetterGeneratedDevOnly).not.toHaveBeenCalled()
  })
})
