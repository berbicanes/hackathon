/**
 * Squad analysis: age adjustment and selection logic.
 * Pure functions only; everything runs in the browser and nothing is sent anywhere.
 */

export interface Player {
  name: string
  birthDate: Date
  score: number
}

export interface AnalysedPlayer extends Player {
  id: number
  ageMonths: number
  /** Birth quarter in the selection year: 1 = the three months after the cut-off (oldest) … 4 = the three before it. */
  quarter: 1 | 2 | 3 | 4
  /** How much better than the squad trend predicts for this age (positive = better, whatever the test direction). */
  residual: number
  /** Residual shifted back onto the score scale (score at the squad's average age). */
  fairScore: number
  rawRank: number
  fairRank: number
  /** Positive = moves up when age is taken into account. */
  rankGain: number
  /** Share of the squad with a lower residual, 0–100. */
  agePercentile: number
}

export interface LinearFit {
  intercept: number
  /** Score points per month of age. */
  slope: number
  /** 95% confidence interval for the slope; null when it cannot be estimated (fewer than 3 children or no age spread). */
  slopeLow: number | null
  slopeHigh: number | null
  /**
   * True when the squad shows a dependable link between age and score: at least
   * MIN_RELIABLE_SQUAD children and a 95% interval for the slope that excludes zero.
   */
  reliable: boolean
}

/** Below this squad size the age trend is treated as orientation only. */
const MIN_RELIABLE_SQUAD = 10

/** Two-sided 95% critical values of Student's t for 1–30 degrees of freedom. */
const T_975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11,
  2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
]

function tCritical(df: number): number {
  // Beyond the table the value approaches 1.96; 2.4 / df matches t to within 0.005 from df = 30 upwards.
  return df <= T_975.length ? T_975[df - 1] : 1.96 + 2.4 / df
}

export interface SquadAnalysis {
  players: AnalysedPlayer[]
  fit: LinearFit
  meanAgeMonths: number
  quarterCounts: [number, number, number, number]
  higherIsBetter: boolean
  /** Month (1–12) in which the selection year starts. */
  cutoffMonth: number
}

export interface AnalysisOptions {
  /** False for tests where a smaller number is the better result, e.g. a sprint in seconds. Default true. */
  higherIsBetter?: boolean
  /** Month (1–12) in which the selection year starts. Default 1 (1 January). */
  cutoffMonth?: number
}

export interface SelectionDiff {
  raw: AnalysedPlayer[]
  fair: AnalysedPlayer[]
  /** Selected only when age is taken into account. */
  gained: AnalysedPlayer[]
  /** Selected only on raw score. */
  lost: AnalysedPlayer[]
}

const MS_PER_DAY = 86_400_000
const DAYS_PER_MONTH = 365.25 / 12

/** Age in (fractional) months at the reference date. */
function ageInMonths(birthDate: Date, reference: Date): number {
  const days = (reference.getTime() - birthDate.getTime()) / MS_PER_DAY
  return days / DAYS_PER_MONTH
}

function birthQuarter(birthDate: Date, cutoffMonth: number): 1 | 2 | 3 | 4 {
  const monthsIntoYear = (birthDate.getUTCMonth() - (cutoffMonth - 1) + 12) % 12
  return (Math.floor(monthsIntoYear / 3) + 1) as 1 | 2 | 3 | 4
}

/** Selection-year starts the app offers: 1 January (UEFA default), 1 September (England, Wales), 1 April (Japan). */
export const CUTOFF_MONTHS = [1, 9, 4] as const

/**
 * Labels for the four birth quarters of a selection year that starts in `cutoffMonth`
 * (1–12), oldest children first: e.g. cut-off 9 → "Sep–Nov", "Dec–Feb", "Mar–May", "Jun–Aug".
 */
export function quarterLabels(monthNames: string[], cutoffMonth: number): string[] {
  return [0, 1, 2, 3].map((q) => {
    const start = (cutoffMonth - 1 + q * 3) % 12
    return `${monthNames[start]}–${monthNames[(start + 2) % 12]}`
  })
}

/** Label for the older half of the selection year, e.g. cut-off 9 → "Sep–Feb". */
export function olderHalfLabel(monthNames: string[], cutoffMonth: number): string {
  return `${monthNames[(cutoffMonth - 1) % 12]}–${monthNames[(cutoffMonth + 4) % 12]}`
}

/** Ordinary least squares fit y = intercept + slope * x. Flat line if x has no spread. */
function linearFit(xs: number[], ys: number[]): LinearFit {
  const n = xs.length
  const unknown = { slopeLow: null, slopeHigh: null, reliable: false }
  if (n === 0) return { intercept: 0, slope: 0, ...unknown }
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2
    sxy += (xs[i] - meanX) * (ys[i] - meanY)
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = meanY - slope * meanX
  if (n < 3 || sxx === 0) return { intercept, slope, ...unknown }

  // Standard error of the slope from the residual variance, then a t interval with n − 2 degrees of freedom.
  let sse = 0
  for (let i = 0; i < n; i++) sse += (ys[i] - (intercept + slope * xs[i])) ** 2
  const margin = tCritical(n - 2) * Math.sqrt(sse / (n - 2) / sxx)
  const slopeLow = slope - margin
  const slopeHigh = slope + margin
  const excludesZero = slopeLow > 0 || slopeHigh < 0
  return { intercept, slope, slopeLow, slopeHigh, reliable: n >= MIN_RELIABLE_SQUAD && excludesZero }
}

function rankBy(players: { id: number; name: string }[], key: (id: number) => number): Map<number, number> {
  const sorted = [...players].sort(
    (a, b) => key(b.id) - key(a.id) || a.name.localeCompare(b.name) || a.id - b.id,
  )
  return new Map(sorted.map((p, i) => [p.id, i + 1]))
}

/**
 * How many score units a month of extra age is worth in the "better" direction, with its
 * 95% interval. For a lower-is-better test a falling line means older children do better,
 * so the sign is flipped and the interval ends swap.
 */
export function ageAdvantage(fit: LinearFit, higherIsBetter: boolean): { perMonth: number; low: number | null; high: number | null } {
  if (higherIsBetter) return { perMonth: fit.slope, low: fit.slopeLow, high: fit.slopeHigh }
  return {
    perMonth: -fit.slope || 0,
    low: fit.slopeHigh === null ? null : -fit.slopeHigh || 0,
    high: fit.slopeLow === null ? null : -fit.slopeLow || 0,
  }
}

export function analyseSquad(players: Player[], reference: Date, options: AnalysisOptions = {}): SquadAnalysis {
  const higherIsBetter = options.higherIsBetter ?? true
  /** +1 when a higher score is better, −1 when a lower one is. */
  const direction = higherIsBetter ? 1 : -1
  const cutoffMonth = options.cutoffMonth ?? 1
  const base = players.map((p, id) => ({ ...p, id, ageMonths: ageInMonths(p.birthDate, reference) }))
  const fit = linearFit(
    base.map((p) => p.ageMonths),
    base.map((p) => p.score),
  )
  const n = base.length
  const meanAgeMonths = n ? base.reduce((a, p) => a + p.ageMonths, 0) / n : 0
  const meanScore = n ? base.reduce((a, p) => a + p.score, 0) / n : 0

  // "Better than expected for this age" is always positive, whatever the test direction.
  const residuals = new Map(
    base.map((p) => [p.id, direction * (p.score - (fit.intercept + fit.slope * p.ageMonths))]),
  )
  const raw = new Map(base.map((p) => [p.id, direction * p.score]))
  const rawRanks = rankBy(base, (id) => raw.get(id) ?? 0)
  const fairRanks = rankBy(base, (id) => residuals.get(id) ?? 0)

  const quarterCounts: [number, number, number, number] = [0, 0, 0, 0]
  const sortedResiduals = [...residuals.values()].sort((a, b) => a - b)

  const analysed: AnalysedPlayer[] = base.map((p) => {
    const residual = residuals.get(p.id) ?? 0
    const quarter = birthQuarter(p.birthDate, cutoffMonth)
    quarterCounts[quarter - 1]++
    const rawRank = rawRanks.get(p.id) ?? n
    const fairRank = fairRanks.get(p.id) ?? n
    const below = sortedResiduals.filter((r) => r < residual).length
    return {
      ...p,
      quarter,
      residual,
      // Back on the original scale: for a lower-is-better test a better child gets a lower fair score.
      fairScore: meanScore + direction * residual,
      rawRank,
      fairRank,
      rankGain: rawRank - fairRank,
      agePercentile: n > 1 ? Math.round((below / (n - 1)) * 100) : 50,
    }
  })

  return { players: analysed, fit, meanAgeMonths, quarterCounts, higherIsBetter, cutoffMonth }
}

/** Compare a top-N selection on raw score with one on age-adjusted score. */
export function compareSelections(players: AnalysedPlayer[], topN: number): SelectionDiff {
  const n = Math.max(0, Math.min(Math.floor(topN), players.length))
  const raw = [...players].sort((a, b) => a.rawRank - b.rawRank).slice(0, n)
  const fair = [...players].sort((a, b) => a.fairRank - b.fairRank).slice(0, n)
  const rawIds = new Set(raw.map((p) => p.id))
  const fairIds = new Set(fair.map((p) => p.id))
  return {
    raw,
    fair,
    gained: fair.filter((p) => !rawIds.has(p.id)),
    lost: raw.filter((p) => !fairIds.has(p.id)),
  }
}

export interface GroupRecommendation {
  /** Everyone in the top N on raw score. Nobody is removed. */
  keep: AnalysedPlayer[]
  /**
   * The one list of highlighted children: first those who would be selected once age is
   * taken into account, then the borderline ones, each part in age-adjusted rank order.
   */
  secondLook: AnalysedPlayer[]
  /** The part of `secondLook` that is too close to the last place to call. */
  borderline: AnalysedPlayer[]
  /** Size of the expanded group. */
  size: number
}

/** At most this many children are called borderline. */
const MAX_BORDERLINE = 3

/**
 * Children immediately below the last age-adjusted place, where the uncertainty of the
 * age trend could swap the order. Two children's adjusted scores differ by
 * Δscore − slope × Δage, so the slope's 95% half-width times their age difference is how
 * far that comparison could move.
 *
 * The rule is monotonic: walk down the age-adjusted ranking from just below the last
 * place, take each child while their gap is within that uncertainty, and stop at the
 * first child who does not qualify (or after MAX_BORDERLINE). A lower-ranked child is
 * never borderline while a higher-ranked one is not. Children already in the group on
 * raw score are skipped: they are staying anyway. Without an interval nobody qualifies.
 */
function borderlineChildren(players: AnalysedPlayer[], diff: SelectionDiff, fit: LinearFit | undefined): AnalysedPlayer[] {
  const last = diff.fair[diff.fair.length - 1]
  if (!last || !fit || fit.slopeLow === null || fit.slopeHigh === null) return []
  const halfWidth = (fit.slopeHigh - fit.slopeLow) / 2
  const taken = new Set([...diff.raw, ...diff.fair].map((p) => p.id))
  const below = players.filter((p) => !taken.has(p.id)).sort((a, b) => a.fairRank - b.fairRank)
  const borderline: AnalysedPlayer[] = []
  for (const p of below) {
    const withinUncertainty = last.residual - p.residual <= halfWidth * Math.abs(p.ageMonths - last.ageMonths)
    if (!withinUncertainty || borderline.length >= MAX_BORDERLINE) break
    borderline.push(p)
  }
  return borderline
}

/**
 * Default recommendation: a second look, not a swap. Keep the raw top N and widen the
 * group by the children the age-adjusted ranking would have selected, plus those too
 * close to the last place to call ("borderline"). Pass the squad's fit to enable the
 * borderline rule and the no-age-advantage guard.
 */
export function recommendGroup(
  players: AnalysedPlayer[],
  topN: number,
  fit?: LinearFit,
  higherIsBetter = true,
): GroupRecommendation {
  const diff = compareSelections(players, topN)
  // If older children do not score better in this squad, there is no age disadvantage to
  // correct, so nobody is added on the strength of the adjustment.
  if (fit && ageAdvantage(fit, higherIsBetter).perMonth <= 0) {
    return { keep: diff.raw, secondLook: [], borderline: [], size: diff.raw.length }
  }
  const borderline = borderlineChildren(players, diff, fit)
  const secondLook = [...diff.gained, ...borderline]
  return { keep: diff.raw, secondLook, borderline, size: diff.raw.length + secondLook.length }
}
