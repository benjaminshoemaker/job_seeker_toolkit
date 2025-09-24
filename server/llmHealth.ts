const HEALTH_URL = 'https://api.openai.com/v1/models';
const DEFAULT_TIMEOUT_MS = 5000;

export interface LLMHealthInput {
  key: string;
  model?: string;
  timeoutMs?: number;
}

export interface LLMHealthResult {
  ok: boolean;
  provider: 'openai';
  model: string;
  hasKey: boolean;
  reachable: boolean;
  auth: 'ok' | 'unauthorized' | 'forbidden' | 'missing_key' | 'unknown';
  modelsCount?: number;
  status?: number;
}

export async function checkLLMHealth(input: LLMHealthInput, fetchImpl: typeof fetch = fetch): Promise<LLMHealthResult> {
  const key = String(input?.key || '');
  const model = String(input?.model || '');
  const timeoutMs = Number.isFinite(input?.timeoutMs) ? Number(input?.timeoutMs) : DEFAULT_TIMEOUT_MS;

  if (!key) {
    return {
      ok: false,
      provider: 'openai',
      model,
      hasKey: false,
      reachable: false,
      auth: 'missing_key',
    };
  }

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(HEALTH_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal as any,
    } as any);
    clearTimeout(to);

    if (r.status === 401) {
      return { ok: false, provider: 'openai', model, hasKey: true, reachable: true, auth: 'unauthorized', status: r.status };
    }
    if (r.status === 403) {
      return { ok: false, provider: 'openai', model, hasKey: true, reachable: true, auth: 'forbidden', status: r.status };
    }
    if (!r.ok) {
      return { ok: false, provider: 'openai', model, hasKey: true, reachable: true, auth: 'unknown', status: r.status };
    }
    let count = undefined as number | undefined;
    try {
      const data = await r.json();
      const arr = Array.isArray((data as any)?.data) ? (data as any).data : [];
      count = arr.length;
    } catch {}
    return { ok: true, provider: 'openai', model, hasKey: true, reachable: true, auth: 'ok', modelsCount: count, status: r.status };
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    return { ok: false, provider: 'openai', model, hasKey: true, reachable: !aborted, auth: 'unknown' };
  }
}

