/**
 * The only request shape the explanation proxy accepts. Numbers, booleans and three
 * fixed codes: no names, no dates, no free text. Anything else is rejected.
 * Shared by the Worker (validation) and the web app (payload builder + tests).
 */

export interface ExplainSquad {
  /** Children in the squad. */
  size: number
  /** Places the coach selects. */
  places: number
  /** Score units a month of extra age is worth, in the "better" direction. */
  agePerMonth: number
  /** 95% interval for agePerMonth; null when it cannot be estimated. */
  agePerMonthLow: number | null
  agePerMonthHigh: number | null
  /** True when the squad has 10+ children and the interval excludes zero. */
  reliable: boolean
  /** Month (1–12) in which the selection year starts. */
  cutoffMonth: number
  higherIsBetter: boolean
  /** Children who would be selected once age is taken into account. */
  entrants: number
  /** Children too close to the last place to call. */
  borderline: number
}

export interface ExplainChild {
  ageMonths: number
  /** Positive = younger than the squad average. */
  monthsYoungerThanAverage: number
  score: number
  adjustedScore: number
  rawRank: number
  adjustedRank: number
  /** Born in the last quarter of the selection year. */
  lateBorn: boolean
  borderline: boolean
  secondLook: boolean
}

export interface ExplainRequest {
  v: 1
  kind: 'child' | 'squad'
  language: 'bs' | 'en'
  squad: ExplainSquad
  /** Present exactly when kind is "child". */
  child?: ExplainChild
}

type Check = (value: unknown) => boolean

const int = (min: number, max: number): Check => (v) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const num = (min: number, max: number): Check => (v) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const bool: Check = (v) => typeof v === 'boolean'
const nullable = (check: Check): Check => (v) => v === null || check(v)
const oneOf = (...allowed: unknown[]): Check => (v) => allowed.includes(v)

const SCORE = num(-1_000_000, 1_000_000)

const SQUAD: Record<keyof ExplainSquad, Check> = {
  size: int(2, 300),
  places: int(1, 300),
  agePerMonth: SCORE,
  agePerMonthLow: nullable(SCORE),
  agePerMonthHigh: nullable(SCORE),
  reliable: bool,
  cutoffMonth: int(1, 12),
  higherIsBetter: bool,
  entrants: int(0, 300),
  borderline: int(0, 3),
}

const CHILD: Record<keyof ExplainChild, Check> = {
  ageMonths: num(36, 300),
  monthsYoungerThanAverage: int(-36, 36),
  score: SCORE,
  adjustedScore: SCORE,
  rawRank: int(1, 300),
  adjustedRank: int(1, 300),
  lateBorn: bool,
  borderline: bool,
  secondLook: bool,
}

/** True when `value` is a plain object with exactly the keys in `shape`, each passing its check. */
function matches(value: unknown, shape: Record<string, Check>): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  const expected = Object.keys(shape)
  return keys.length === expected.length && expected.every((key) => key in record && shape[key](record[key]))
}

/**
 * Returns the request when it is exactly the documented shape, otherwise null.
 * Unknown keys, strings other than the fixed codes, and out-of-range numbers all fail.
 */
export function parseExplainRequest(body: unknown): ExplainRequest | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  const isChild = record.kind === 'child'
  const top: Record<string, Check> = {
    v: oneOf(1),
    kind: oneOf('child', 'squad'),
    language: oneOf('bs', 'en'),
    squad: (v) => matches(v, SQUAD),
    ...(isChild ? { child: (v: unknown) => matches(v, CHILD) } : {}),
  }
  if (!matches(record, top)) return null
  const request = record as unknown as ExplainRequest
  if (request.child && (request.child.rawRank > request.squad.size || request.child.adjustedRank > request.squad.size)) return null
  return request
}
