/**
 * Optional AI explanation layer. The math in squad.ts makes every decision; this module
 * only prepares a de-identified summary of numbers for the explanation proxy and falls
 * back to the app's own text whenever the proxy is off, slow or failing.
 *
 * What leaves the device, and only after the coach clicks "Explain": numbers, booleans
 * and three fixed codes. Never a name, never a birth date.
 */
import type { ExplainChild, ExplainRequest, ExplainSquad } from '../../worker/src/schema'
import { ageAdvantage, type AnalysedPlayer, type GroupRecommendation, type SquadAnalysis } from './squad'

const round = (value: number, digits: number) => Number(value.toFixed(digits))
const roundOrNull = (value: number | null, digits: number) => (value === null ? null : round(value, digits))

function squadFacts(analysis: SquadAnalysis, group: GroupRecommendation): ExplainSquad {
  const advantage = ageAdvantage(analysis.fit, analysis.higherIsBetter)
  return {
    size: analysis.players.length,
    places: group.keep.length,
    agePerMonth: round(advantage.perMonth, 2),
    agePerMonthLow: roundOrNull(advantage.low, 2),
    agePerMonthHigh: roundOrNull(advantage.high, 2),
    reliable: analysis.fit.reliable,
    cutoffMonth: analysis.cutoffMonth,
    higherIsBetter: analysis.higherIsBetter,
    entrants: group.secondLook.length - group.borderline.length,
    borderline: group.borderline.length,
  }
}

/** Squad-level payload for the recommendation card. */
export function buildSquadPayload(analysis: SquadAnalysis, group: GroupRecommendation, language: 'bs' | 'en'): ExplainRequest {
  return { v: 1, kind: 'squad', language, squad: squadFacts(analysis, group) }
}

/** Payload for one child's player card: their numbers plus the squad context, no identity. */
export function buildChildPayload(
  analysis: SquadAnalysis,
  group: GroupRecommendation,
  player: AnalysedPlayer,
  language: 'bs' | 'en',
): ExplainRequest {
  const child: ExplainChild = {
    ageMonths: round(player.ageMonths, 1),
    monthsYoungerThanAverage: Math.round(analysis.meanAgeMonths - player.ageMonths),
    score: round(player.score, 2),
    adjustedScore: round(player.fairScore, 2),
    rawRank: player.rawRank,
    adjustedRank: player.fairRank,
    lateBorn: player.quarter === 4,
    borderline: group.borderline.some((p) => p.id === player.id),
    secondLook: group.secondLook.some((p) => p.id === player.id),
  }
  return { v: 1, kind: 'child', language, squad: squadFacts(analysis, group), child }
}

export type Explanation = { source: 'ai'; text: string } | { source: 'fallback' }

interface RequestOptions {
  /** Proxy address; empty switches the AI layer off. */
  endpoint: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export const EXPLAIN_TIMEOUT_MS = 10_000
const MAX_EXPLANATION_LENGTH = 1_500

/**
 * Asks the proxy for an explanation. Never throws: any problem (switched off, offline,
 * timeout, rate limit, error status, unexpected response) resolves to the fallback, and
 * the caller shows the app's own deterministic text instead.
 */
export async function requestExplanation(payload: ExplainRequest, options: RequestOptions): Promise<Explanation> {
  if (!options.endpoint) return { source: 'fallback' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? EXPLAIN_TIMEOUT_MS)
  try {
    const response = await (options.fetchImpl ?? fetch)(options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) return { source: 'fallback' }
    const data: unknown = await response.json()
    const text = typeof data === 'object' && data !== null ? (data as { text?: unknown }).text : undefined
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_EXPLANATION_LENGTH) return { source: 'fallback' }
    return { source: 'ai', text: text.trim() }
  } catch {
    return { source: 'fallback' }
  } finally {
    clearTimeout(timer)
  }
}
