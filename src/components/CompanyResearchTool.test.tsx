import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'
import { CompanyResearchTool } from './CompanyResearchTool'

describe('CompanyResearchTool (frontend)', () => {
  beforeEach(() => {
    // @ts-expect-error test polyfill
    global.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input)
      if (url.includes('/api/jd-from-url')) {
        return new Response(JSON.stringify({ text: 'JD text', host: 'example.com', warnings: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('/api/company-research')) {
        return new Response(JSON.stringify({ markdown: '# Summary', json: { company: 'Acme', stage: 'Early', summary: { what: 'a', momentum: 'b', ai: 'c', leadership: 'd', verdict: 'Buy' }, leadership: { founder_market_fit: 'x', track_record: 'y', org_stability: 'z', board_governance: 'g', ai_ownership: 'own' }, snapshot: { products: [], icp: [], pricing_model: 'free', geo: 'US', headcount_trend: 'up' }, financials: { profitability: 'prof', cash_runway_months: null, burn_trend: 'flat', customer_concentration: 'low' }, traction: { nrr: null, grr: null, acv_bands: [], logos: [] }, ai: { in_product: 'yes', internal_use: 'ok', stack: 'x', evals: 'n/a', safety_privacy: 'ok' }, security_compliance: { certs: [], dpa: 'n/a', residency: 'us', retention: '90d' }, capital_structure: { investors: [], board: 'x', prefs: 'std', option_pool_remaining_pct: null, secondaries: 'n/a' }, comp_equity: { salary_signals: 'x', equity_scenarios: { bear: null, base: null, bull: null }, assumptions: 'n/a' }, distribution: { channels: [], partnerships: [], moat: 'x', sales_motion: 'plg' }, team_culture: { manager_signal: 'x', attrition_signal: 'y', rto_policy: 'z' }, risks: [], role_fit: { impact_12mo: 'x', initiatives: [], red_flags: [] }, evidence_table: [], confidence: { leadership: 0.5, financials: 0.5, ai: 0.5, overall: 0.5 } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as any
  })
  afterEach(() => vi.restoreAllMocks())

  it('requires company and runs research', async () => {
    render(<CompanyResearchTool onBack={() => {}} />)
    const run = await screen.findByRole('button', { name: /run research/i })
    expect(run).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme' } })
    expect(screen.getByRole('button', { name: /run research/i })).toBeEnabled()
    fireEvent.click(run)
    const all = await screen.findAllByText(/Summary/i)
    expect(all.length).toBeGreaterThan(0)
  })

  it('imports JD from URL', async () => {
    render(<CompanyResearchTool onBack={() => {}} />)
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme' } })
    const urlInput = screen.getByLabelText(/job posting url/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/j' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))
    await screen.findByText(/Imported from example.com/i)
    await screen.findByDisplayValue(/JD text/i)
  })
})
