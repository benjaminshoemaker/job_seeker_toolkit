// PostHog analytics helpers (server-side)

function isProd() { return (process.env.NODE_ENV || 'development') === 'production' }
function getIngestHost() { return process.env.POSTHOG_INGESTION_HOST || 'https://us.i.posthog.com' }
function getApiHost() { return process.env.POSTHOG_API_HOST || 'https://app.posthog.com' }
function getPHIngestKey() {
  return isProd() ? (process.env.POSTHOG_PROD_PROJECT_KEY || '') : (process.env.POSTHOG_DEV_PROJECT_KEY || '')
}
function getPHProjectId() {
  return isProd() ? (process.env.POSTHOG_PROD_PROJECT_ID || '') : (process.env.POSTHOG_DEV_PROJECT_ID || '')
}
function getPHPersonalKey() {
  return isProd() ? (process.env.POSTHOG_PROD_PERSONAL_API_KEY || '') : (process.env.POSTHOG_DEV_PERSONAL_API_KEY || '')
}

export async function phCapture({ event, properties = {}, distinct_id }) {
  const apiKey = getPHIngestKey()
  if (!apiKey) return
  const body = {
    api_key: apiKey,
    event,
    properties: { ...properties, distinct_id: distinct_id || `server-${Math.random().toString(36).slice(2, 10)}` },
    distinct_id: distinct_id || undefined,
    timestamp: new Date().toISOString(),
  }
  try {
    const r = await fetch(`${getIngestHost().replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      console.warn('[posthog] capture failed', r.status, t)
    }
  } catch (e) {
    console.warn('[posthog] capture error', e?.message || e)
  }
}

// Simple in-memory cache for stats
const statsCache = {
  key: '',
  ts: 0,
  data: null,
}

export async function phCountCoverLetters() {
  const projectId = getPHProjectId()
  const token = getPHPersonalKey()
  if (!projectId || !token) return { total: 0 }
  const cacheKey = `${projectId}:cover_letter_generated`
  const now = Date.now()
  if (statsCache.key === cacheKey && now - statsCache.ts < 60_000 && statsCache.data) {
    return statsCache.data
  }
  const url = `${getApiHost().replace(/\/$/, '')}/api/projects/${projectId}/query/`
  const payload = {
    query: { kind: 'HogQLQuery', query: "SELECT count() AS total FROM events WHERE event = 'cover_letter_generated'" },
  }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      console.warn('[posthog] query failed', r.status, t)
      return { total: 0 }
    }
    const data = await r.json().catch(() => ({}))
    let total = 0
    if (Array.isArray(data?.results)) {
      const first = data.results[0]
      if (Array.isArray(first)) total = Number(first[0] || 0)
      else if (first && typeof first.total !== 'undefined') total = Number(first.total || 0)
    } else if (typeof data?.result === 'number') {
      total = Number(data.result)
    }
    const out = { total: Number.isFinite(total) ? total : 0 }
    statsCache.key = cacheKey; statsCache.ts = now; statsCache.data = out
    return out
  } catch (e) {
    console.warn('[posthog] query error', e?.message || e)
    return { total: 0 }
  }
}

// Test-only: reset cache between tests
export function __resetStatsCache() {
  statsCache.key = ''
  statsCache.ts = 0
  statsCache.data = null
}

export const __internals = { getPHIngestKey, getPHProjectId, getPHPersonalKey, getIngestHost, getApiHost, isProd }
