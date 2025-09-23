// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractJD, extractFromJSONLD, extractWithReadability, extractHeuristics } from './jdExtractor.js';

const htmlJsonLd = `
<!doctype html><html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Senior Engineer",
  "description": "<p>Build things</p>",
  "qualifications": "<ul><li>BS/MS</li></ul>",
  "responsibilities": "<ul><li>Code</li></ul>"
}
</script>
</head><body><div>Other content</div></body></html>`;

const htmlReadable = `<!doctype html><html><body><article><h1>Software Engineer</h1><p>We are hiring.</p><h2>Responsibilities</h2><ul><li>Build</li></ul><h2>Qualifications</h2><ul><li>Experience</li></ul></article></body></html>`;

describe('jd extractors', () => {
  it('extracts from JSON-LD', () => {
    const r = extractFromJSONLD(htmlJsonLd);
    expect(r?.text).toMatch(/Senior Engineer/);
    expect(r?.source).toBe('jsonld');
  });

  it('extracts with readability', () => {
    const r = extractWithReadability(htmlReadable, 'https://example.com/post');
    expect(r?.text).toMatch(/Software Engineer/);
  });

  it('heuristics fallback', () => {
    const r = extractHeuristics('<h2>Responsibilities</h2><p>Do stuff</p>');
    expect(r?.text).toMatch(/Do stuff/);
  });

  it('pipeline selects best available', () => {
    const r = extractJD(htmlJsonLd, 'https://example.com');
    expect(r.text).toMatch(/Senior Engineer/);
    expect(['jsonld','readability','heuristics']).toContain(r.source);
  });
});

