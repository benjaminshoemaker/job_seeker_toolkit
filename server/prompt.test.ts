import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __promptInternals, __serverInternals } from './server.js';

const randomText = (label: string) => `${label}-${Math.random().toString(36).slice(2)}`;

describe('buildPrompts output guidance', () => {
  it('only describes the JD metadata failure path with manual entry instructions', () => {
    const resume = randomText('resume');
    const jd = randomText('jd');
    const { user } = __promptInternals.buildPrompts(resume, jd);

    expect(user).toContain('Output rules');
    expect(user).toMatch(/Gate passed → Output only the final cover-letter body text/i);
    expect(user).toMatch(/Could not identify the company name or role title/i);
    expect(user).toMatch(/add this information at the top of the job description/i);
    expect(user).toMatch(/Company:\s*\[Company Name]/);
    expect(user).toMatch(/Role:\s*\[Role Title]/);
  });

  it('omits legacy resume evidence failure messaging', () => {
    const resume = randomText('resume');
    const jd = randomText('jd');
    const { user } = __promptInternals.buildPrompts(resume, jd);

    expect(user).not.toMatch(/INSUFFICIENT_RESUME_EVIDENCE/);
    expect(user).not.toMatch(/two_quantified_results/);
  });
});

describe('ensureThreeParagraphs', () => {
  const { ensureThreeParagraphs } = __serverInternals;

  it('keeps exactly three provided paragraphs and normalises spacing', () => {
    const input = ['Para one. ', ' Para two with detail.', '\nPara three final. '].join('\n\n');
    const result = ensureThreeParagraphs(input);
    expect(result).toBe('Para one.\n\nPara two with detail.\n\nPara three final.');
  });

  it('splits single block text into three paragraphs', () => {
    const input = 'Word '.repeat(90).trim();
    const result = ensureThreeParagraphs(input);
    const parts = result.split('\n\n');
    expect(parts).toHaveLength(3);
    expect(parts.join(' ')).toContain('Word');
  });
});

describe('callOpenAI error handling', () => {
  const { callOpenAI } = __serverInternals;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('throws a structured error when JD metadata cannot be inferred', async () => {
    const errorPayload = {
      status: 'error',
      error: 'INSUFFICIENT_JD_METADATA',
      message: 'Could not identify the company name or role title from the job description. Please add this information at the top of the job description using this format:\n\nCompany: [Company Name]\nRole: [Role Title]\n\n[Rest of job description]',
      missing: ['company', 'role_title'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(errorPayload) }),
    });

    await expect(callOpenAI('resume text', 'jd text', new AbortController().signal)).rejects.toMatchObject({
      code: 'INSUFFICIENT_JD_METADATA',
      message: expect.stringContaining('Could not identify the company name or role title'),
      metadata: errorPayload,
    });
  });
});
