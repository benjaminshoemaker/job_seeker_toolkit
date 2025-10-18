import { describe, it, expect } from 'vitest'
import { extractJSONAndMarkdown, validateCompanyResearchJSON } from './server.js'

describe('company-research helpers', () => {
  it('extracts JSON from trailing object (no fence)', () => {
    const raw = [
      'Report about a company',
      '',
      '{"company":"Acme","stage":"Early","summary":{"what":"a","momentum":"b","ai":"c","leadership":"d","verdict":"Buy"},"leadership":{"founder_market_fit":"x","track_record":"y","org_stability":"z","board_governance":"g","ai_ownership":"own"},"snapshot":{"products":[],"icp":[],"pricing_model":"free","geo":"US","headcount_trend":"up"},"financials":{"profitability":"prof","cash_runway_months":null,"burn_trend":"flat","customer_concentration":"low"},"traction":{"nrr":null,"grr":null,"acv_bands":[],"logos":[]},"ai":{"in_product":"yes","internal_use":"ok","stack":"x","evals":"n/a","safety_privacy":"ok"},"security_compliance":{"certs":[],"dpa":"n/a","residency":"us","retention":"90d"},"capital_structure":{"investors":[],"board":"x","prefs":"std","option_pool_remaining_pct":null,"secondaries":"n/a"},"comp_equity":{"salary_signals":"x","equity_scenarios":{"bear":null,"base":null,"bull":null},"assumptions":"n/a"},"distribution":{"channels":[],"partnerships":[],"moat":"x","sales_motion":"plg"},"team_culture":{"manager_signal":"x","attrition_signal":"y","rto_policy":"z"},"risks":[],"role_fit":{"impact_12mo":"x","initiatives":[],"red_flags":[]},"evidence_table":[],"confidence":{"leadership":0.5,"financials":0.5,"ai":0.5,"overall":0.5}}'
    ].join('\n')
    const { json, markdown } = extractJSONAndMarkdown(raw)
    expect(json.company).toBe('Acme')
    const v = validateCompanyResearchJSON(json)
    expect(v.ok).toBe(true)
    expect(markdown).toMatch(/Report/)
  })
})
