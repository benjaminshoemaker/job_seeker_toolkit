// Minimal Node server for OpenAI integration and static serving
// One provider only: OpenAI Chat Completions API

import { createServer } from 'node:http';
import { readFileSync, statSync, createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { extractResumeFromBuffer, OCR_WARNING, isPDF, isDOCX } from './extract.js';
import { extractJD } from './jdExtractor.js';
import { URL as NodeURL } from 'node:url';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import Busboy from 'busboy';
import { checkLLMHealth } from './llmHealth.js';
import { phCapture, phCountCoverLetters } from './analytics.js';

const PORT = Number(process.env.PORT || 8787);
const BUILD_DIR = resolve(process.cwd(), 'build');

// Tiny .env loader (no deps). Only sets if not already defined.
try {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) {
        const val = m[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        process.env[m[1]] = val;
      }
    }
  }
} catch {}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

const MAX_INPUT = 10_000;
const MODEL_TIMEOUT_MS = 20_000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const JD_FETCH_TIMEOUT_MS = 10_000;
const JD_MAX_BYTES = 3 * 1024 * 1024; // 3 MB cap

const IS_PROD = NODE_ENV === 'production';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(data || '{}');
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    try {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
      let resolved = false;
      bb.on('file', (name, file, info) => {
        if (name !== 'file') { file.resume(); return; }
        const { filename, mimeType } = info;
        const chunks = [];
        let total = 0;
        file.on('data', (d) => {
          total += d.length;
          chunks.push(d);
        });
        file.on('limit', () => {
          if (!resolved) { resolved = true; reject(new Error('File too large')); }
          try { file.resume(); } catch {}
        });
        file.on('end', () => {
          if (resolved) return;
          const buffer = Buffer.concat(chunks);
          resolved = true;
          resolve({ file: { filename, contentType: mimeType, buffer, size: buffer.length } });
        });
      });
      bb.on('error', (e) => { if (!resolved) { resolved = true; reject(e); } });
      bb.on('finish', () => { if (!resolved) reject(new Error('No file uploaded.')); });
      req.pipe(bb);
    } catch (e) {
      reject(e);
    }
  });
}

function ensureThreeParagraphs(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  let paras = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 3) return paras.join('\n\n');
  const allText = paras.length ? paras.join(' ') : trimmed.replace(/\n+/g, ' ');
  const words = allText.split(/\s+/);
  const per = Math.ceil(words.length / 3);
  const p1 = words.slice(0, per).join(' ');
  const p2 = words.slice(per, per * 2).join(' ');
  const p3 = words.slice(per * 2).join(' ');
  return [p1, p2, p3].filter((p) => p.trim().length).join('\n\n');
}

function buildPrompts(resume, jd) {
  const system = "You write professional cover letters using only the supplied resume and job description. Do not invent facts. Body text only. No headers or contact blocks.";
  const user = `Title: Single-Pass Cover Letter Writer with Built-In Extraction and Validation

Mode
Run two phases in one response: (A) JD metadata extraction, (B) letter composition gated by validation.

Inputs
- Job description (JD): ${jd}
- Resume: ${resume}

Phase A — Extract + Validate (JD only)
1) Extract verbatim substrings from the JD:
- company
- role_title
- location (optional; map to {onsite|hybrid|remote} and city/region if present)
- product_or_strategy_detail (short JD phrase: product name, market, customer segment, or strategy term)

Normalization
- Trim whitespace. Remove ™/®. Preserve Unicode. Keep original casing.

Validation
- company must be a real employer name. Ignore placeholders like: Confidential, Our company, We, The Company, Stealth, Employer.
- role_title must include a profession noun (e.g., Product Manager, Data Scientist, Engineer).
- If multiple titles, pick the one attached to responsibilities or the apply CTA.
- Gate: if company or role_title missing → Output Rule 2.

Phase B — Compose (only if Gate passed)
Goal: short, tailored cover-letter body that improves callbacks.
Length: 180–240 words. 2–3 paragraphs. Body text only.

Hard constraints
- Use ONLY facts from the resume and JD. No fabrication.
- Mention {{company}} and {{role_title}} in the first sentence.
- Include product_or_strategy_detail.
- Evidence: use quantified results from the resume when available, prioritizing hard numbers > scale indicators > relative improvements > specific distinctions. If metrics are absent, work with qualitative achievements and specific accomplishments from the resume.
- Employer-first framing: state JD needs, then map proof to outcomes.
- No headers, dates, addresses, salutations, or sign-offs.
- Avoid boilerplate and clichés (e.g., "passionate," "thrilled," "world-class," "dynamic self-starter").
- Limit first-person sentence starts to ≤2 sentences total.
- Humanity Touch (each exactly once, specific and factual):
	- One unusual, concrete resume detail a generic AI would miss.
	- A genuine tie to {{company}}'s mission/product grounded in JD specifics.
	- One brief authentic-voice line that sounds plausibly human and not templated.

Writing Style:

**PERPLEXITY & PREDICTABILITY CONTROL:**
- Deliberately choose unexpected, creative word alternatives instead of obvious ones
- Include some colloquialisms, idioms, and region-specific expressions
- Add subtle imperfections that humans naturally make (minor redundancies, natural speech patterns)

**EMOTIONAL INTELLIGENCE & HUMAN TOUCH:**
- Infuse genuine emotional undertones appropriate to the content
- Add subtle humor, sarcasm, or personality where appropriate

**CONTEXTUAL AUTHENTICITY:**
- Reference current events, popular culture, or common experiences
- Add transitional phrases that feel conversational rather than mechanical

**FINAL REQUIREMENTS:**
- Ensure the writing sounds like it came from a real person with authentic voice
- Make it feel like natural human communication, not polished AI output

Micro-method
- Infer top JD needs/outcomes.
- Select 2–3 resume proof points, prioritizing concrete metrics when available. If no metrics exist, use specific achievements, technologies, or relevant experience.
- If a risk is implied (relocation/industry switch/gap), add one risk-reduction line tied to JD needs.
- Write: opening (1–2 sentences with goal and fit), core (4–6 sentences with measurable impact when possible), close (1–2 sentences with specific motivation + one concrete thing you would deliver).

Quality checks
- References {{company}}, {{role_title}}, and product_or_strategy_detail.
- Uses quantified results from resume when available; otherwise uses specific qualitative achievements.
- 1+ specific JD detail integrated.
- 180–240 words, 2–3 paragraphs.
- No fabrication. No copy-paste of resume bullets.

AI style filter
- Ban: em dashes, ellipses, exclamation marks, rhetorical questions.
- Semicolons ≤1. Prefer periods.
- Digits for 2+ and metrics; no ~, +, ≈ unless present in resume; use "about/over".
- No quotes around ordinary terms.
- Delete boilerplate phrases (examples: "I am writing to express my interest", "excited to apply", "proven track record", "fast-paced environments", "cutting-edge", "world-class", "synergy", "dynamic self-starter", "Dear Hiring Manager,").
- Replace "leverage/utilize" with "use" when adequate.
- Never use the following words/phrases: "passionate", "thrilled", "synergy", "world-class", "rockstar", "ninja", "guru", "wizard", "dynamic self-starter", "think outside the box"
- Phrases like "results-oriented," "detail-oriented," "strong communicator," "team player," "passionate about [industry]" must either be removed or immediately followed by a metric-backed proof in the same paragraph. If no proof available, delete.
- Sentence starters "Additionally," "Furthermore," "Moreover," "In addition," "As such," "Thus," "Therefore," "Overall": ≤1 total; vary syntax.
- Adverbs ending in "-ly": ≤3 total.

Output rules (choose exactly one)
1) Gate passed → Output only the final cover-letter body text. Nothing else.
2) JD gate failed →
{
"status": "error",
"error": "INSUFFICIENT_JD_METADATA",
"message": "Could not identify the company name or role title from the job description. Please add this information at the top of the job description using this format:\\n\\nCompany: [Company Name]\\nRole: [Role Title]\\n\\n[Rest of job description]",
"missing": ["company" | "role_title"]
}`;
  return { system, user };
}

async function callOpenAI(resume, jd, signal) {
  const { system, user } = buildPrompts(resume, jd);

  // Build Responses API payload (recommended API)
  // Use instructions + simple input string to avoid content-type incompatibilities
  const base = {
    model: OPENAI_MODEL,
    instructions: system,
    input: user,
    response_format: { type: 'text' },
    modalities: ['text'],
  };

  function buildBody(opts) {
    const body = { ...base };
    if (opts.useMaxOutputTokens) body.max_output_tokens = 700;
    if (opts.useMaxTokens) body.max_tokens = 700; // fallback for some models
    if (opts.useMaxCompletionTokens) body.max_completion_tokens = 700; // fallback for chat-only variants
    if (opts.includeTemperature) body.temperature = 0.3;
    if (!opts.includeResponseFormat) delete body.response_format;
    if (!opts.includeModalities) delete body.modalities;
    return body;
  }

  async function request(body) {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    return r;
  }

  // Adaptive retry strategy for model parameter differences
  let opts = { useMaxOutputTokens: true, useMaxTokens: false, useMaxCompletionTokens: false, includeTemperature: true, includeResponseFormat: true, includeModalities: true };
  for (let attempt = 0; attempt < 4; attempt++) {
    let resp = await request(buildBody(opts));
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      // Prefer Responses API shapes
      let text = '';
      if (typeof data?.output_text === 'string') {
        text = data.output_text;
      } else if (Array.isArray(data?.output)) {
        const texts = [];
        for (const item of data.output) {
          const parts = Array.isArray(item?.content) ? item.content : [];
          for (const part of parts) {
            if (typeof part?.text === 'string' && part.text.trim()) {
              texts.push(part.text);
            } else if (part?.type === 'output_text' && typeof part?.text === 'string') {
              texts.push(part.text);
            }
          }
        }
        text = texts.join('\n\n');
      } else if (Array.isArray(data?.choices)) {
        // Fallback if Responses API proxies to chat-like output
        text = data.choices?.[0]?.message?.content || '';
      }
      const raw = String(text || '').trim();
      // If model returned an error JSON, try to salvage or propagate the error
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.status === 'error' && parsed.error === 'INSUFFICIENT_JD_METADATA') {
          const dbg = parsed.debug || {};
          const confTotal = Number(dbg?.confidence?.total || 0);
          const threshold = Number(dbg?.confidence?.threshold || 0.8);
          const extracted = dbg?.extracted || {};
          const cand = parsed.candidates || {};

          // Prefer a mathematically recomputed total from contributions if present
          let recomputed = NaN;
          try {
            const contrib = dbg?.confidence?.contributions || {};
            const vals = Object.values(contrib).map((v) => Number(v) || 0);
            if (vals.length) {
              const sum = vals.reduce((a, b) => a + b, 0);
              recomputed = Math.min(1, Math.max(0, sum));
            }
          } catch {}
          const conf = Number.isFinite(recomputed) ? recomputed : confTotal;

          function pick(list, allowBlocked = false) {
            const arr = Array.isArray(list) ? list : [];
            const ranked = arr
              .filter((x) => allowBlocked || (x?.match_type !== 'blocklisted' && x?.match_type !== 'job_board'))
              .sort((a, b) => Number(b?.similarity || 0) - Number(a?.similarity || 0));
            return ranked[0]?.text || '';
          }

          const extractedCompany = pick(extracted?.company);
          const extractedRole = pick(extracted?.role_title, true);
          const fallbackCompany = Array.isArray(cand?.company) ? cand.company[0] : '';
          const fallbackRole = Array.isArray(cand?.role_title) ? cand.role_title[0] : '';
          const company = String(extractedCompany || fallbackCompany || '').trim();
          const role_title = String(extractedRole || fallbackRole || '').trim();
          const detail = Array.isArray(extracted?.product_or_strategy_detail) && extracted.product_or_strategy_detail[0]?.text
            ? extracted.product_or_strategy_detail[0].text
            : '';

          const hasCompany = !!company;
          const hasRole = !!role_title && /(manager|engineer|scientist|designer|analyst|lead|director|specialist|architect|developer|marketer|pm|product|sales|recruiter|consultant)/i.test(role_title);
          const gatePasses = hasCompany && hasRole && conf >= (threshold || 0.8);

          if (gatePasses) {
            console.warn('[openai] Overriding JD gate failure using extracted candidates', { company, role_title, conf });
            const letter = await composeLetterWithOverrides(resume, jd, { company, role_title, detail }, signal, request, buildBody);
            return ensureThreeParagraphs(String(letter || '').trim());
          } else {
            // Salvage failed - throw error with the message from the LLM
            const err = new Error(parsed.message || 'INSUFFICIENT_JD_METADATA');
            err.code = 'INSUFFICIENT_JD_METADATA';
            err.metadata = parsed;
            throw err;
          }
        }
      } catch (e) {
        // If it's our INSUFFICIENT_JD_METADATA error, re-throw it
        if (e?.code === 'INSUFFICIENT_JD_METADATA') throw e;
        // Otherwise, not JSON or salvage not applicable; continue
      }

      return ensureThreeParagraphs(raw);
    }
    const txt = await resp.text().catch(() => '');
    const lower = (txt || '').toLowerCase();
    const is400 = resp.status === 400;

    if (is400 && lower.includes('unsupported parameter') && lower.includes('max_output_tokens') && opts.useMaxOutputTokens) {
      opts.useMaxOutputTokens = false; opts.useMaxTokens = true; continue;
    }
    if (is400 && lower.includes('unsupported parameter') && lower.includes('max_tokens') && opts.useMaxTokens) {
      opts.useMaxTokens = false; opts.useMaxCompletionTokens = true; continue;
    }
    if (
      is400 && opts.includeTemperature &&
      ((lower.includes('unsupported value') && lower.includes('temperature')) ||
       (lower.includes('unsupported parameter') && lower.includes('temperature')))
    ) {
      opts.includeTemperature = false; continue;
    }
    if (
      is400 && opts.includeResponseFormat &&
      ((lower.includes('unsupported parameter') || lower.includes('unknown parameter')) && lower.includes('response_format'))
    ) {
      opts.includeResponseFormat = false; continue;
    }
    if (
      is400 && opts.includeModalities &&
      ((lower.includes('unsupported parameter') || lower.includes('unknown parameter')) && lower.includes('modalities'))
    ) {
      opts.includeModalities = false; continue;
    }
    throw new Error(`OpenAI error ${resp.status}: ${txt || resp.statusText}`);
  }
  throw new Error('OpenAI request failed after retries');
}

async function composeLetterWithOverrides(resume, jd, { company, role_title, detail }, signal, request, buildBody) {
  const system = "You write professional cover letters using only the supplied resume and job description. Do not invent facts. Body text only. No headers or contact blocks.";
  const user = `Title: Single-Pass Cover Letter Writer — Compose Only\n\nInputs\n- Job description (JD): ${jd}\n- Resume: ${resume}\n- Gate is pre-approved with:\n  - company: ${company}\n  - role_title: ${role_title}\n  - product_or_strategy_detail: ${detail || '(optional)'}\n\nTask\nWrite ONLY the cover letter body (no JSON, no headers), 180–240 words, 2–3 paragraphs.\nConstraints\n- Mention ${company} and ${role_title} in the first sentence.\n- Include the product_or_strategy_detail if relevant.\n- Use only facts from the resume and JD; use quantified results when available, otherwise work with qualitative achievements and specific accomplishments from the resume.\n- No salutations or sign-offs. Body text only.`;

  const base = {
    model: OPENAI_MODEL,
    instructions: system,
    input: user,
    response_format: { type: 'text' },
    modalities: ['text'],
  };
  const body = buildBody({ useMaxOutputTokens: true, includeTemperature: true, includeResponseFormat: true, includeModalities: true });
  const resp = await request(body);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`OpenAI compose override error ${resp.status}: ${txt || resp.statusText}`);
  }
  const data = await resp.json().catch(() => ({}));
  if (typeof data?.output_text === 'string') return data.output_text;
  if (Array.isArray(data?.output)) {
    const texts = [];
    for (const item of data.output) {
      const parts = Array.isArray(item?.content) ? item.content : [];
      for (const part of parts) {
        if (typeof part?.text === 'string' && part.text.trim()) texts.push(part.text);
        else if (part?.type === 'output_text' && typeof part?.text === 'string') texts.push(part.text);
      }
    }
    return texts.join('\n\n');
  }
  if (Array.isArray(data?.choices)) {
    return data.choices?.[0]?.message?.content || '';
  }
  return '';
}

function validateEnvOrExit() {
  const errs = [];
  if (!OPENAI_API_KEY) errs.push('OPENAI_API_KEY');
  if (!OPENAI_MODEL) errs.push('OPENAI_MODEL');
  if (errs.length) {
    console.error(`[server] Missing required env: ${errs.join(', ')}. See .env.example.`);
    process.exit(1);
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const isProd = NODE_ENV === 'production';
  const isApi = (req.url || '').startsWith('/api/');
  const host = req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] || '').toString() || 'https';
  const siteOrigin = host ? `${proto}://${host}` : '';

  // Always include standard headers
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Non-API routes: permissive
  if (!isApi) {
    if (!isProd) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    return { allowed: true };
  }

  // API routes
  if (!isProd) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    return { allowed: true };
  }

  // In production: allow if same-origin or explicitly allowed by env
  const allowedSet = new Set(String(ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean));
  const sameOrigin = origin && siteOrigin && origin === siteOrigin;
  const inAllowlist = origin && allowedSet.has(origin);
  const allowed = sameOrigin || inAllowlist;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  return { allowed };
}

const IS_TEST = !!process.env.VITEST || process.env.NODE_ENV === 'test';
if (!IS_TEST) {
  validateEnvOrExit();
}

const server = createServer(async (req, res) => {
  try {
    // CORS
    const cors = applyCors(req, res);
    if (req.method === 'OPTIONS') {
      if (!cors.allowed) { 
        console.warn('[cors] Preflight blocked', { url: req.url, origin: req.headers.origin });
        res.writeHead(403); return res.end('CORS not allowed'); 
      }
      res.writeHead(204); return res.end();
    }
    if (!cors.allowed) { 
      console.warn('[cors] Request blocked', { url: req.url, origin: req.headers.origin });
      res.writeHead(403); return res.end('CORS not allowed'); 
    }

    if ((req.url || '').startsWith('/api/')) {
      console.log('[api]', req.method, req.url, { origin: req.headers.origin || '' });
    }

    // LLM health check (no-cost endpoint)
    if (req.url === '/api/llm/health' && req.method === 'GET') {
      try {
        const result = await checkLLMHealth({ key: OPENAI_API_KEY, model: OPENAI_MODEL });
        return sendJSON(res, 200, result);
      } catch (e) {
        console.error('[api] /api/llm/health error', e?.message || e);
        return sendJSON(res, 500, { ok: false, error: 'health_check_failed' });
      }
    }

    if (req.url === '/api/cover-letter/generate' && req.method === 'POST') {
      if (!OPENAI_API_KEY) {
        console.error('[openai] Missing OPENAI_API_KEY');
        return sendJSON(res, 500, { error: 'Missing OPENAI_API_KEY' });
      }

      let body;
      try { body = await parseBody(req); } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
      const resume = String(body?.resume || '').slice(0, MAX_INPUT + 1);
      const jd = String(body?.jd || '').slice(0, MAX_INPUT + 1);

      if (!resume.trim() || !jd.trim()) return sendJSON(res, 400, { error: 'Both resume and jd are required.' });
      if (resume.length > MAX_INPUT || jd.length > MAX_INPUT) return sendJSON(res, 413, { error: 'Input too long (max 10k chars each).' });

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), MODEL_TIMEOUT_MS);
      try {
        const letter = await callOpenAI(resume, jd, ac.signal);
        clearTimeout(timeout);
        if (!letter || !String(letter).trim()) {
          console.error('[openai] Empty model response');
          return sendJSON(res, 502, { error: 'Empty model response' });
        }
        // Fire-and-forget analytics capture (server-side, production-safe)
        const distinctId = String(req.headers['x-ph-distinct-id'] || '').trim() || undefined;
        phCapture({ event: 'cover_letter_generated', properties: { channel: 'server' }, distinct_id: distinctId });
        return sendJSON(res, 200, { letter });
      } catch (e) {
        clearTimeout(timeout);
        // Handle INSUFFICIENT_JD_METADATA error specially
        if (e?.code === 'INSUFFICIENT_JD_METADATA') {
          console.warn('[openai] JD metadata extraction failed', e.message);
          return sendJSON(res, 400, {
            error: 'INSUFFICIENT_JD_METADATA',
            message: e.message,
            metadata: e.metadata
          });
        }
        // Handle other errors
        const msg = e?.name === 'AbortError' ? 'Provider timeout' : (e?.message || 'Generation failed');
        console.error('[openai] Error', msg);
        return sendJSON(res, e?.name === 'AbortError' ? 504 : 500, { error: msg });
      }
    }

    if (req.url === '/api/extract-resume' && req.method === 'POST') {
      console.log('[api] /api/extract-resume start');
      // multipart/form-data with single file "file"
      try {
        const { file } = await parseMultipart(req);
        const { filename, contentType, buffer, size } = file || {};
        if (!buffer || !size) return sendJSON(res, 400, { error: 'No file uploaded.' });
        if (size > MAX_UPLOAD_BYTES) return sendJSON(res, 413, { error: 'File too large (max 5 MB).' });
        const allowed = isPDF(filename, contentType) || isDOCX(filename, contentType);
        if (!allowed) return sendJSON(res, 400, { error: 'Unsupported file type. Only PDF and DOCX are allowed.' });

        // Extract
        const t0 = Date.now();
        const { text, warnings, meta } = await extractResumeFromBuffer(buffer, filename, contentType);
        const elapsed = Date.now() - t0;
        const trimmed = String(text || '').trim();
        const out = {
          text: trimmed,
          warnings: Array.isArray(warnings) ? warnings : [],
          meta: { ...(meta || {}), chars: trimmed.length },
        };
        // Empty extraction case
        if (!trimmed) {
          if (isPDF(filename, contentType)) {
            if (!out.warnings.includes(OCR_WARNING)) out.warnings.push(OCR_WARNING);
          }
        }
        console.log('[api] /api/extract-resume ok', { ms: elapsed, chars: trimmed.length });
        return sendJSON(res, 200, out);
      } catch (e) {
        const tooLarge = /too large/i.test(String(e?.message || ''));
        const msg = tooLarge ? 'File too large (max 5 MB).' : 'Extraction failed. The file may be corrupted.';
        console.error('[api] /api/extract-resume error', e?.message || e);
        return sendJSON(res, tooLarge ? 413 : 400, { error: msg });
      }
    }

    if (req.url === '/api/jd-from-url' && req.method === 'POST') {
      console.log('[api] /api/jd-from-url start');
      let body;
      try { body = await parseBody(req); } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
      const urlStr = String(body?.url || '').trim();
      if (!urlStr) return sendJSON(res, 400, { error: 'URL is required.' });
      let parsed;
      try { parsed = new NodeURL(urlStr); } catch { return sendJSON(res, 400, { error: 'Invalid URL.' }); }
      if (parsed.protocol !== 'https:') return sendJSON(res, 400, { error: 'Only HTTPS URLs are supported.' });
      // SSRF guard: block localhost and private ranges via DNS resolution
      const host = parsed.hostname;
      try {
        const { address } = await lookup(host, { all: false });
        const ip = address;
        const isV4 = isIP(ip) === 4;
        const isV6 = isIP(ip) === 6;
        const isPrivateV4 = isV4 && (
          ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('192.168.') || (ip.startsWith('172.') && (() => { const n = parseInt(ip.split('.')[1], 10); return n >= 16 && n <= 31; })())
        );
        const isLoopbackV6 = isV6 && (ip === '::1' || ip.startsWith('fe80:'));
        if (isPrivateV4 || isLoopbackV6) {
          return sendJSON(res, 400, { error: 'Unsupported or private address.' });
        }
      } catch (e) {
        console.error('[api] dns lookup failed', e?.message || e);
        return sendJSON(res, 400, { error: 'DNS resolution failed.' });
      }

      // Fetch with redirect cap and size cap
      let current = parsed;
      const visited = new Set();
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), JD_FETCH_TIMEOUT_MS);
      try {
        for (let i = 0; i < 5; i++) {
          if (visited.has(current.toString())) return sendJSON(res, 400, { error: 'Redirect loop detected.' });
          visited.add(current.toString());
          const r = await fetch(current, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSeekerToolkit/0.1; +https://example.local)' }, signal: ctrl.signal });
          if ([301,302,303,307,308].includes(r.status)) {
            const loc = r.headers.get('location');
            if (!loc) return sendJSON(res, 400, { error: 'Redirect without location.' });
            current = new NodeURL(loc, current);
            if (current.protocol !== 'https:') return sendJSON(res, 400, { error: 'Redirected to non-HTTPS URL.' });
            continue;
          }
          if (!r.ok) {
            console.error('[api] fetch failed', { status: r.status, url: current.toString() });
            return sendJSON(res, 400, { error: `Fetch failed (${r.status}).` });
          }
          const ctype = String(r.headers.get('content-type') || '').toLowerCase();
          const allowed = ctype.includes('text/html') || ctype.includes('application/ld+json');
          if (!allowed) return sendJSON(res, 415, { error: 'Unsupported content type.' });

          const reader = r.body?.getReader ? r.body.getReader() : null;
          let buf = new Uint8Array(0);
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                const n = new Uint8Array(buf.length + value.length);
                n.set(buf); n.set(value, buf.length); buf = n;
                if (buf.length > JD_MAX_BYTES) { clearTimeout(to); return sendJSON(res, 413, { error: 'Response too large.' }); }
              }
            }
          } else {
            const ab = await r.arrayBuffer();
            if (ab.byteLength > JD_MAX_BYTES) { clearTimeout(to); return sendJSON(res, 413, { error: 'Response too large.' }); }
            buf = new Uint8Array(ab);
          }
          clearTimeout(to);
          const html = Buffer.from(buf).toString('utf8');
          const { text, source } = extractJD(html, current.toString());
          const cleaned = String(text || '').trim();
          if (!cleaned || cleaned.length < 50) {
            console.warn('[api] extractor empty', { url: current.toString() });
            return sendJSON(res, 422, { error: 'No extractable text found. Paste the job description text instead.', warnings: ['Empty or near-empty page'] });
          }
          console.log('[api] /api/jd-from-url ok', { host: current.host, chars: cleaned.length });
          return sendJSON(res, 200, { text: cleaned, source, host: current.host, warnings: [] });
        }
        return sendJSON(res, 400, { error: 'Too many redirects.' });
      } catch (e) {
        const msg = e?.name === 'AbortError' ? 'Timeout while fetching URL.' : 'Failed to fetch URL.';
        console.error('[api] /api/jd-from-url error', msg);
        return sendJSON(res, e?.name === 'AbortError' ? 504 : 400, { error: msg });
      }
    }

    
    // Basic stats endpoint: total cover letters generated
    if (req.url === '/api/stats/cover-letters' && req.method === 'GET') {
      const out = await buildStatsResponse();
      return sendJSON(res, out.code, out.data);
    }


    // Static files (production)
    try {
      let path = req.url || '/';
      if (path === '/') path = '/index.html';
      const filePath = join(BUILD_DIR, path);
      const st = statSync(filePath);
      if (st.isFile()) {
        const type = MIME[extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        return createReadStream(filePath).pipe(res);
      }
    } catch {
      // Fallback to SPA index for client routing
      try {
        const html = readFileSync(join(BUILD_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch {}
    }

    res.statusCode = 404; res.end('Not found');
  } catch (err) {
    sendJSON(res, 500, { error: 'Server error' });
  }
});

if (!IS_TEST) {
  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log('[server] env', { NODE_ENV, OPENAI_MODEL, ALLOWED_ORIGIN });
  });
}

export async function buildStatsResponse() {
  try {
    const { total } = await phCountCoverLetters();
    return { code: 200, data: { total, env: IS_PROD ? 'production' : 'development' } };
  } catch (e) {
    return { code: 500, data: { error: 'stats_failed' } };
  }
}

export const __promptInternals = { buildPrompts };
export const __serverInternals = { ensureThreeParagraphs, callOpenAI, composeLetterWithOverrides };
