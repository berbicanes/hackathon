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
  /** Birth quarter in the selection year (cut-off 1 January): 1 = Jan–Mar … 4 = Oct–Dec. */
  quarter: 1 | 2 | 3 | 4
  /** Score minus what the squad trend predicts for this age. */
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
  slope: number
}

export interface SquadAnalysis {
  players: AnalysedPlayer[]
  fit: LinearFit
  meanAgeMonths: number
  quarterCounts: [number, number, number, number]
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

function birthQuarter(birthDate: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(birthDate.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4
}

/** Ordinary least squares fit y = intercept + slope * x. Flat line if x has no spread. */
function linearFit(xs: number[], ys: number[]): LinearFit {
  const n = xs.length
  if (n === 0) return { intercept: 0, slope: 0 }
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2
    sxy += (xs[i] - meanX) * (ys[i] - meanY)
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  return { intercept: meanY - slope * meanX, slope }
}

function rankBy(players: { id: number; name: string }[], key: (id: number) => number): Map<number, number> {
  const sorted = [...players].sort(
    (a, b) => key(b.id) - key(a.id) || a.name.localeCompare(b.name) || a.id - b.id,
  )
  return new Map(sorted.map((p, i) => [p.id, i + 1]))
}

export function analyseSquad(players: Player[], reference: Date): SquadAnalysis {
  const base = players.map((p, id) => ({ ...p, id, ageMonths: ageInMonths(p.birthDate, reference) }))
  const fit = linearFit(
    base.map((p) => p.ageMonths),
    base.map((p) => p.score),
  )
  const n = base.length
  const meanAgeMonths = n ? base.reduce((a, p) => a + p.ageMonths, 0) / n : 0
  const meanScore = n ? base.reduce((a, p) => a + p.score, 0) / n : 0

  const residuals = new Map(base.map((p) => [p.id, p.score - (fit.intercept + fit.slope * p.ageMonths)]))
  const raw = new Map(base.map((p) => [p.id, p.score]))
  const rawRanks = rankBy(base, (id) => raw.get(id) ?? 0)
  const fairRanks = rankBy(base, (id) => residuals.get(id) ?? 0)

  const quarterCounts: [number, number, number, number] = [0, 0, 0, 0]
  const sortedResiduals = [...residuals.values()].sort((a, b) => a - b)

  const analysed: AnalysedPlayer[] = base.map((p) => {
    const residual = residuals.get(p.id) ?? 0
    const quarter = birthQuarter(p.birthDate)
    quarterCounts[quarter - 1]++
    const rawRank = rawRanks.get(p.id) ?? n
    const fairRank = fairRanks.get(p.id) ?? n
    const below = sortedResiduals.filter((r) => r < residual).length
    return {
      ...p,
      quarter,
      residual,
      fairScore: meanScore + residual,
      rawRank,
      fairRank,
      rankGain: rawRank - fairRank,
      agePercentile: n > 1 ? Math.round((below / (n - 1)) * 100) : 50,
    }
  })

  return { players: analysed, fit, meanAgeMonths, quarterCounts }
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
  /** Children who would be selected once age is taken into account: add them, reassess later. */
  secondLook: AnalysedPlayer[]
  /** Size of the expanded group. */
  size: number
}

/**
 * Default recommendation: a second look, not a swap. Keep the raw top N and widen the
 * group by the children the age-adjusted ranking would have selected.
 */
export function recommendGroup(players: AnalysedPlayer[], topN: number): GroupRecommendation {
  const diff = compareSelections(players, topN)
  return { keep: diff.raw, secondLook: diff.gained, size: diff.raw.length + diff.gained.length }
}

/** Players who climb the most once age is accounted for (only real gains). */
export function hiddenTalents(players: AnalysedPlayer[], limit = 3): AnalysedPlayer[] {
  return players
    .filter((p) => p.rankGain > 0)
    .sort((a, b) => b.rankGain - a.rankGain || a.fairRank - b.fairRank)
    .slice(0, limit)
}
