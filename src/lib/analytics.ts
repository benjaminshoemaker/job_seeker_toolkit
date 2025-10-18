import posthog from 'posthog-js'

let initialized = false

function getClientKey(): string | undefined {
  const prod = import.meta.env.PROD
  const prodKey = (import.meta.env.VITE_POSTHOG_PROD_KEY as string | undefined) || undefined
  const devKey = (import.meta.env.VITE_POSTHOG_DEV_KEY as string | undefined) || undefined
  return prod ? prodKey : devKey
}

function getApiHost(): string {
  // Ingestion host for client SDK
  const env = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || ''
  return env || 'https://us.i.posthog.com'
}

export function initAnalytics() {
  if (initialized) return
  const key = getClientKey()
  if (!key) return // analytics disabled if no key
  posthog.init(key, {
    api_host: getApiHost(),
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage+cookie',
    // Respect dev: do not send events from localhost unless explicitly configured with dev key
    // Here we initialize only if dev key is present.
  })
  initialized = true
}

export function getDistinctId(): string | undefined {
  try {
    // Only available if initialized
    // posthog.get_distinct_id() returns a string
    // Wrap in try/catch to avoid issues when posthog not loaded
    // @ts-ignore posthog types
    return posthog.get_distinct_id?.()
  } catch {
    return undefined
  }
}

export function trackCoverLetterGeneratedDevOnly() {
  // Avoid double counting: in production, server emits this event.
  if (import.meta.env.PROD) return
  try {
    // Guard if not initialized
    // @ts-ignore posthog types
    if (typeof posthog.capture === 'function') {
      posthog.capture('cover_letter_generated', { channel: 'client' })
    }
  } catch {}
}

export function trackCompanyResearchGeneratedDevOnly() {
  if (import.meta.env.PROD) return
  try {
    // @ts-ignore
    if (typeof posthog.capture === 'function') {
      posthog.capture('company_research_generated', { channel: 'client' })
    }
  } catch {}
}

export { posthog }
