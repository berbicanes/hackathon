/**
 * Late Bloomers explanation proxy (Cloudflare Worker).
 *
 * POST /explain with a strictly validated, de-identified payload → a short plain-language
 * explanation from Claude. The deterministic math in the web app makes every decision;
 * this service only puts numbers into words.
 *
 * - The Anthropic API key is a Worker secret (ANTHROPIC_API_KEY); it is never in the repo.
 * - CORS: only the deployed site may call it.
 * - Rate limit: 20 requests per hour per IP, counted under a salted hash that expires.
 * - Nothing is logged: no request bodies, no responses, no IP addresses.
 */
import Anthropic from '@anthropic-ai/sdk'
import { buildUserMessage, SYSTEM_PROMPT } from './prompt'
import { parseExplainRequest } from './schema'

interface RateLimitStore {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>
}

interface Env {
  ANTHROPIC_API_KEY?: string
  RATE_LIMIT?: RateLimitStore
}

const ALLOWED_ORIGIN = 'https://berbicanes.github.io'
const MODEL = 'claude-sonnet-5-5'
const MAX_TOKENS = 400
const MAX_BODY_BYTES = 2_000
const REQUESTS_PER_HOUR = 20
const HOUR_SECONDS = 3_600
/** The web app gives up after 10 s, so the upstream call must fail sooner. */
const UPSTREAM_TIMEOUT_MS = 8_500

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
}

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders, ...extra },
  })
}

/** Counter key that cannot be turned back into an IP address and changes every hour. */
async function rateKey(ip: string, hourBucket: number): Promise<string> {
  const bytes = new TextEncoder().encode(`late-bloomers:${hourBucket}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `rl:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** True when this caller is still under the hourly limit; counts the request. */
async function underRateLimit(store: RateLimitStore, ip: string): Promise<boolean> {
  const key = await rateKey(ip, Math.floor(Date.now() / 1000 / HOUR_SECONDS))
  const used = Number((await store.get(key)) ?? '0')
  if (used >= REQUESTS_PER_HOUR) return false
  await store.put(key, String(used + 1), { expirationTtl: HOUR_SECONDS })
  return true
}

async function explain(request: Request, env: Env): Promise<Response> {
  // Fail loudly when the deployment is incomplete instead of pretending to work.
  if (!env.ANTHROPIC_API_KEY || !env.RATE_LIMIT) return json(503, { error: 'not_configured' })

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (!(await underRateLimit(env.RATE_LIMIT, ip))) return json(429, { error: 'rate_limited' }, { 'retry-after': String(HOUR_SECONDS) })

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_large' })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const payload = parseExplainRequest(body)
  if (!payload) return json(400, { error: 'invalid_request' })

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: UPSTREAM_TIMEOUT_MS })
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // A four-sentence explanation needs no deliberation; keep the whole budget for the answer.
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(payload) }],
    })
    // A declined or cut-off answer is not shown; the web app falls back to its own text.
    if (message.stop_reason !== 'end_turn') return json(502, { error: 'no_explanation' })
    const text = message.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join(' ')
      .trim()
    if (!text) return json(502, { error: 'no_explanation' })
    return json(200, { text, model: MODEL })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json(503, { error: 'busy' }, { 'retry-after': '60' })
    if (error instanceof Anthropic.AuthenticationError) return json(503, { error: 'not_configured' })
    if (error instanceof Anthropic.APIError) return json(502, { error: 'upstream_error' })
    return json(502, { error: 'upstream_unreachable' })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/explain') return json(404, { error: 'not_found' })
    // Browsers on any other site are refused. (A non-browser client can forge this header,
    // which is why the schema is strict and the rate limit exists.)
    if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return json(403, { error: 'forbidden_origin' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST, OPTIONS' })
    if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return json(415, { error: 'json_only' })
    return explain(request, env)
  },
}
