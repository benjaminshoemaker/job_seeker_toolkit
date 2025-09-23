// Minimal Node server for OpenAI integration and static serving
// One provider only: OpenAI Chat Completions API

import { createServer } from 'node:http';
import { readFileSync, statSync, createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

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

async function callOpenAI(resume, jd, signal) {
  const system = "You write professional cover letters using only the supplied resume and job description. Do not invent facts. Body text only. No headers or contact blocks.";
  const user = `Goal: Draft a professional cover letter in three concise paragraphs (~220 words).
Constraints:
- Use only information present or directly implied by the resume and job description.
- Do not add contact blocks, dates, or headings. Provide only the body text.

Resume:
${resume}

Job description:
${jd}

Output: Only the cover letter body text, three paragraphs.`;

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
      return ensureThreeParagraphs(String(text || '').trim());
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
  if (!isProd) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return { allowed: true };
  }
  if (!ALLOWED_ORIGIN) return { allowed: false };
  const allowed = new Set(ALLOWED_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean));
  const ok = origin && allowed.has(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return { allowed: ok };
}

validateEnvOrExit();

const server = createServer(async (req, res) => {
  try {
    // CORS
    const cors = applyCors(req, res);
    if (req.method === 'OPTIONS') {
      if (!cors.allowed) { res.writeHead(403); return res.end('CORS not allowed'); }
      res.writeHead(204); return res.end();
    }
    if (!cors.allowed) { res.writeHead(403); return res.end('CORS not allowed'); }

    if (req.url === '/api/cover-letter/generate' && req.method === 'POST') {
      if (!OPENAI_API_KEY) return sendJSON(res, 500, { error: 'Missing OPENAI_API_KEY' });

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
          return sendJSON(res, 502, { error: 'Empty model response' });
        }
        return sendJSON(res, 200, { letter });
      } catch (e) {
        clearTimeout(timeout);
        const msg = e?.name === 'AbortError' ? 'Provider timeout' : (e?.message || 'Generation failed');
        return sendJSON(res, e?.name === 'AbortError' ? 504 : 500, { error: msg });
      }
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

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
