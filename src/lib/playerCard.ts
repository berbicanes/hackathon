/**
 * Plain-language summary for one child. Deliberately never labels a child negatively:
 * every outcome is "keep", "take a second look" or "reassess later".
 */
import type { AnalysedPlayer } from './squad'

export type Advice =
  /** Younger than average and held back by age: the core "late bloomer" case. */
  | 'secondLook'
  /** Strong for their age whatever their birth month. */
  | 'keep'
  /** Older than average; part of the score may be an age advantage. */
  | 'checkAgeAdvantage'
  /** Everyone else: keep developing, reassess with the group. */
  | 'reassess'

export interface PlayerSummary {
  /** Positive = younger than squad average, in whole months. */
  monthsYounger: number
  /** Top X% of the squad for their age (1–100). */
  topPercentForAge: number
  rawRank: number
  fairRank: number
  squadSize: number
  advice: Advice
}

/** Months of age difference treated as meaningful. */
const AGE_GAP_MONTHS = 3
const STRONG_PERCENTILE = 80

export function summarisePlayer(player: AnalysedPlayer, meanAgeMonths: number, squadSize: number): PlayerSummary {
  const monthsYounger = Math.round(meanAgeMonths - player.ageMonths)
  const topPercentForAge = Math.max(1, 100 - player.agePercentile)

  let advice: Advice = 'reassess'
  if (monthsYounger >= AGE_GAP_MONTHS && player.rankGain > 0) advice = 'secondLook'
  else if (player.agePercentile >= STRONG_PERCENTILE) advice = 'keep'
  else if (monthsYounger <= -AGE_GAP_MONTHS && player.rankGain < 0) advice = 'checkAgeAdvantage'

  return {
    monthsYounger,
    topPercentForAge,
    rawRank: player.rawRank,
    fairRank: player.fairRank,
    squadSize,
    advice,
  }
}
