import { describe, it, expect } from 'vitest';
import { checkLLMHealth } from './llmHealth.js';

describe('checkLLMHealth', () => {
  it('returns missing_key when no key provided', async () => {
    const res = await checkLLMHealth({ key: '', model: 'gpt-4o-mini' }, async () => new Response('', { status: 200 }));
    expect(res.ok).toBe(false);
    expect(res.auth).toBe('missing_key');
    expect(res.hasKey).toBe(false);
  });

  it('maps 401 to unauthorized', async () => {
    const res = await checkLLMHealth({ key: 'bad', model: 'gpt-4o-mini' }, async () => new Response('', { status: 401 }));
    expect(res.ok).toBe(false);
    expect(res.auth).toBe('unauthorized');
    expect(res.reachable).toBe(true);
  });

  it('maps 200 to ok and parses models count when present', async () => {
    const body = JSON.stringify({ data: [{ id: 'a' }, { id: 'b' }] });
    const res = await checkLLMHealth({ key: 'good', model: 'gpt-4o-mini' }, async () => new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(res.ok).toBe(true);
    expect(res.auth).toBe('ok');
    expect(res.modelsCount).toBe(2);
  });
});

