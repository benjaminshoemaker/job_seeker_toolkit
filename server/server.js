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

    if (req.url === '/api/extract-resume' && req.method === 'POST') {
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
        return sendJSON(res, 200, out);
      } catch (e) {
        const msg = /too large/i.test(String(e?.message || '')) ? 'File too large (max 5 MB).' : 'Extraction failed. The file may be corrupted.';
        return sendJSON(res, /too large/i.test(String(e?.message || '')) ? 413 : 400, { error: msg });
      }
    }

    if (req.url === '/api/jd-from-url' && req.method === 'POST') {
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
      } catch {
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
          if (!r.ok) return sendJSON(res, 400, { error: `Fetch failed (${r.status}).` });
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
            return sendJSON(res, 422, { error: 'No extractable text found. Paste the job description text instead.', warnings: ['Empty or near-empty page'] });
          }
          return sendJSON(res, 200, { text: cleaned, source, host: current.host, warnings: [] });
        }
        return sendJSON(res, 400, { error: 'Too many redirects.' });
      } catch (e) {
        const msg = e?.name === 'AbortError' ? 'Timeout while fetching URL.' : 'Failed to fetch URL.';
        return sendJSON(res, e?.name === 'AbortError' ? 504 : 400, { error: msg });
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
