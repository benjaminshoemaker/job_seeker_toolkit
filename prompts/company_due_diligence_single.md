# Company due-diligence prompt (single company, stage-aware, leadership-forward)

Evaluate **[Company]** as a place to work as of **[YYYY-MM-DD]**. Produce both human-readable markdown and the JSON schema exactly.

## Inputs
- company: **[Company]**
- today: **[YYYY-MM-DD]**
- optional_role_function: **[text or empty]**
- optional_location_mode: **[text or empty]**
- optional_role_details:
  - job_url: **[url or empty]**
  - job_title: **[text or empty]**
  - team: **[text or empty]**
  - jd_text: **[multiline or empty]**
- optional_company_hints:
  - products: **[list or empty]**
  - competitors: **[list or empty]**
  - execs: **[list or empty]**
  - urls: **[careers/blog/press/docs or empty]**
  - notes: **[multiline or empty]**

If optional fields are empty, proceed without them. If role details exist, complete “Role fit.”

## Stage detection and weighting
Classify stage from public signals:
- Early/Startup: private and ≤ Series B, or headcount ≤ 150, or ARR < 25M.
- Growth/Pre-IPO: Series C–pre-IPO, or 150–1,000 FTE, or ARR 25–300M.
- Large/Public: ≥ 1,000 FTE or public.

Weights:
- Early: Leadership 35, AI 20, Growth 15, Financial 10, Moat 10, Team 5, Risk 5.
- Growth: Leadership 20, Growth 25, Financial 15, AI 15, Moat 15, Team 5, Risk 5.
- Large: Leadership 10, Growth 25, Financial 25, AI 15, Moat 15, Team 5, Risk 5.

## Research rules
- Browse the web. Favor primary sources. Cite every non-obvious claim with link + date. Absolute dates.
- Minimum evidence: 2 sources for key claims when available. Flag conflicts.
- Recency gates: headcount/hiring ≤ 90 days; funding/runway ≤ 12 months; certs ≤ 18 months unless multi-year; launches ≤ 12 months for “current.”
- Leadership queries: founder/exec bios, prior outcomes/failures, ethics/legal, patents/code/talks, board/investors.
- Security/compliance: SOC 2, ISO 27001, HIPAA/FERPA/PCI/FedRAMP, DPAs, residency, retention.
- AI evidence: repos, papers, patents, model cards, evals, red-team, data provenance.

## Evidence and confidence
For each section compute evidence_count, latest_date, oldest_date, source_diversity, conflict_flag, and confidence 0–1. Fail a claim if all sources >18 months old unless statutory.

## Executive summary
Six lines with bold labels: What, Stage, Momentum, AI, Leadership, Verdict.

## Sections
0) Leadership and governance  
1) Company snapshot  
2) Financial health and durability  
3) AI strategy and execution  
4) Product and distribution  
5) Team and culture  
6) Risk register  
7) Role fit (only if role details provided)

## Additional blocks
- Compensation and equity
- Capital structure and governance
- Runway and hiring plan
- Security, compliance, and legal
- AI proof

## Output format in markdown
- Summary, Sections 0–7, Additional blocks, Evidence table, Confidence block.

## Output format in JSON
Emit the provided `CompanyResearchJSON` exactly. Use null for unknown numbers.

## Scoring and verdict
- Score by stage-weighted rubric. Show total out of 100. One-line verdict: Buy/Neutral/Avoid.

## Constraints
- Short sentences. No hype. Mark inferences. If data is unavailable, say how to get it.

