/**
 * Plain-language summary for one child. Deliberately never labels a child negatively:
 * every outcome is "keep", "take a second look" or "reassess later".
 */
import type { AnalysedPlayer } from './squad'

export type Advice =
  /** On the squad's second-look list: would be selected (or is too close to call) once age is taken into account. */
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

/**
 * `inSecondLook` comes from the squad recommendation (`recommendGroup`): the "take a second
 * look" advice is given to exactly the children on that list, so every view agrees.
 */
export function summarisePlayer(
  player: AnalysedPlayer,
  meanAgeMonths: number,
  squadSize: number,
  inSecondLook = false,
): PlayerSummary {
  const monthsYounger = Math.round(meanAgeMonths - player.ageMonths)
  const topPercentForAge = Math.max(1, 100 - player.agePercentile)

  let advice: Advice = 'reassess'
  if (inSecondLook) advice = 'secondLook'
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
