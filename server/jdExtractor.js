import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

function normalize(text) {
  return String(text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\s*\n\s*\n\s*/g, '\n\n')
    .trim();
}

function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(String(html));
  return normalize($.text());
}

export function extractFromJSONLD(html) {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();
  let best = null;
  for (const s of scripts) {
    const raw = $(s).contents().text();
    try {
      const json = JSON.parse(raw);
      const nodes = Array.isArray(json) ? json : ((json && json['@graph']) ? json['@graph'] : [json]);
      for (const node of nodes) {
        const type = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        if (type.includes('JobPosting')) {
          const parts = [];
          if (node.title) parts.push(String(node.title));
          if (node.description) parts.push(stripHtml(node.description));
          // Heuristic fields
          const fields = ['responsibilities', 'qualifications', 'skills', 'experienceRequirements'];
          for (const f of fields) if (node[f]) parts.push(stripHtml(node[f]));
          const text = normalize(parts.filter(Boolean).join('\n\n'));
          if (text) {
            best = text; break;
          }
        }
      }
      if (best) break;
    } catch {}
  }
  if (best) return { text: best, source: 'jsonld' };
  return null;
}

export function extractWithReadability(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const art = reader.parse();
    const text = normalize(art?.textContent || '');
    if (text) return { text, source: 'readability' };
  } catch {}
  return null;
}

export function extractHeuristics(html) {
  const $ = cheerio.load(html);
  const bodyText = normalize($.text());
  const headings = ['responsibilities', 'requirements', 'qualifications', "what you'll do", 'what you will do', 'minimum', 'preferred'];
  const sections = [];
  $('h1,h2,h3,h4,strong,b').each((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    if (headings.some((h) => t.includes(h))) {
      const block = $(el).parent();
      const snippet = normalize(block.text());
      if (snippet) sections.push(snippet);
    }
  });
  const combined = normalize([sections.join('\n\n'), bodyText].filter(Boolean).join('\n\n'));
  if (combined) return { text: combined, source: 'heuristics' };
  return null;
}

export function extractJD(html, url) {
  // Strategy pipeline
  const j = extractFromJSONLD(html);
  if (j?.text) return j;
  const r = extractWithReadability(html, url);
  if (r?.text) return r;
  const h = extractHeuristics(html);
  if (h?.text) return h;
  return { text: '', source: 'heuristics' };
}
