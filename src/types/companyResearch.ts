export interface CompanyResearchJSON {
  company: string;
  stage: string;
  summary: { what: string; momentum: string; ai: string; leadership: string; verdict: string };
  leadership: { founder_market_fit: string; track_record: string; org_stability: string; board_governance: string; ai_ownership: string };
  snapshot: { products: string[]; icp: string[]; pricing_model: string; geo: string; headcount_trend: string };
  financials: { profitability: string; cash_runway_months: number | null; burn_trend: string; customer_concentration: string };
  traction: { nrr: number | null; grr: number | null; acv_bands: string[]; logos: string[] };
  ai: { in_product: string; internal_use: string; stack: string; evals: string; safety_privacy: string };
  security_compliance: { certs: string[]; dpa: string; residency: string; retention: string };
  capital_structure: { investors: string[]; board: string; prefs: string; option_pool_remaining_pct: number | null; secondaries: string };
  comp_equity: { salary_signals: string; equity_scenarios: { bear: number | null; base: number | null; bull: number | null }; assumptions: string };
  distribution: { channels: string[]; partnerships: string[]; moat: string; sales_motion: string };
  team_culture: { manager_signal: string; attrition_signal: string; rto_policy: string };
  risks: { risk: string; likelihood: string; impact: string }[];
  role_fit: { impact_12mo: string; initiatives: string[]; red_flags: string[] };
  evidence_table: { dimension: string; evidence: string; date: string; source: string }[];
  confidence: { leadership: number; financials: number; ai: number; overall: number };
}

export type CompanyResearchRequest = {
  company: string;
  role_function?: string;
  location_mode?: string;
  today?: string; // YYYY-MM-DD
  role_details?: {
    job_url?: string;
    job_title?: string;
    team?: string;
    jd_text?: string;
  };
  company_hints?: {
    products?: string[];
    competitors?: string[];
    execs?: string[];
    urls?: { careers?: string; blog?: string; press?: string; docs?: string };
    notes?: string;
  };
};

