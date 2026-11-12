/**
 * Data-quality checks on a loaded squad. The analysis never crashes on odd data, but some
 * inputs would make the recommendation misleading if nothing were said, so each of these
 * is shown to the coach as a plain message.
 */
import { ageAdvantage, type SquadAnalysis } from './squad'

export type WarningKind =
  /** Born after the assessment date: the date of the test or a birth date is wrong. */
  | 'bornAfterTest'
  /** More than two years older or younger than the rest: probably a wrong year or another age group. */
  | 'ageOutlier'
  /** A score far from all the others: probably a typing error, and it bends the age trend. */
  | 'scoreOutlier'
  /** The last place and the next one have the same raw score: the order between them is arbitrary. */
  | 'tieAtLastPlace'
  /** Older children do not score better here: nothing to correct, or the test direction is set wrong. */
  | 'noAgeAdvantage'

export interface SquadWarning {
  kind: WarningKind
  /** Children concerned (0 for squad-level warnings). */
  count: number
}

const AGE_OUTLIER_MONTHS = 24
/** Robust z-score (median and MAD) above which a score is treated as an outlier. */
const SCORE_OUTLIER_Z = 6

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function squadWarnings(analysis: SquadAnalysis, topN: number): SquadWarning[] {
  const { players, fit, higherIsBetter } = analysis
  const warnings: SquadWarning[] = []
  if (players.length === 0) return warnings

  const bornAfter = players.filter((p) => p.ageMonths <= 0).length
  if (bornAfter) warnings.push({ kind: 'bornAfterTest', count: bornAfter })

  const medianAge = median(players.map((p) => p.ageMonths))
  const ageOutliers = players.filter((p) => p.ageMonths > 0 && Math.abs(p.ageMonths - medianAge) > AGE_OUTLIER_MONTHS).length
  if (ageOutliers) warnings.push({ kind: 'ageOutlier', count: ageOutliers })

  if (players.length >= 5) {
    const scores = players.map((p) => p.score)
    const mid = median(scores)
    const mad = median(scores.map((s) => Math.abs(s - mid))) * 1.4826
    const scoreOutliers = mad > 0 ? scores.filter((s) => Math.abs(s - mid) / mad > SCORE_OUTLIER_Z).length : 0
    if (scoreOutliers) warnings.push({ kind: 'scoreOutlier', count: scoreOutliers })
  }

  const places = Math.max(0, Math.min(Math.floor(topN), players.length))
  if (places > 0 && places < players.length) {
    const byRaw = [...players].sort((a, b) => a.rawRank - b.rawRank)
    const cutScore = byRaw[places - 1].score
    if (byRaw[places].score === cutScore) {
      warnings.push({ kind: 'tieAtLastPlace', count: players.filter((p) => p.score === cutScore).length })
    }
  }

  // Only when the opposite trend is itself dependable; a flat or noisy trend is covered by the reliability notice.
  if (fit.reliable && ageAdvantage(fit, higherIsBetter).perMonth <= 0) warnings.push({ kind: 'noAgeAdvantage', count: 0 })

  return warnings
}
