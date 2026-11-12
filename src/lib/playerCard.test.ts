import { describe, expect, it } from 'vitest'
import { summarisePlayer } from './playerCard'
import type { AnalysedPlayer } from './squad'

const base: AnalysedPlayer = {
  id: 0,
  name: 'X',
  birthDate: new Date('2014-06-01T00:00:00Z'),
  score: 70,
  ageMonths: 150,
  quarter: 2,
  residual: 0,
  fairScore: 70,
  rawRank: 10,
  fairRank: 10,
  rankGain: 0,
  agePercentile: 50,
}
const mean = 150

describe('summarisePlayer', () => {
  it('asks for a second look at a child on the second-look list', () => {
    const s = summarisePlayer({ ...base, ageMonths: 140, rankGain: 5, agePercentile: 85 }, mean, 20, true)
    expect(s).toMatchObject({ monthsYounger: 10, topPercentForAge: 15, advice: 'secondLook' })
  })
  it('does not say second look for a rank gainer who is not on the list', () => {
    const s = summarisePlayer({ ...base, ageMonths: 140, rankGain: 5, agePercentile: 40 }, mean, 20)
    expect(s.advice).toBe('reassess')
    expect(summarisePlayer({ ...base, ageMonths: 140, rankGain: 5, agePercentile: 40 }, mean, 20, false).advice).toBe('reassess')
  })
  it('says keep for a child strong for their age', () => {
    expect(summarisePlayer({ ...base, agePercentile: 90 }, mean, 20).advice).toBe('keep')
  })
  it('flags a possible age advantage for an older child who drops', () => {
    const s = summarisePlayer({ ...base, ageMonths: 158, rankGain: -4, agePercentile: 30 }, mean, 20)
    expect(s.monthsYounger).toBe(-8)
    expect(s.advice).toBe('checkAgeAdvantage')
  })
  it('defaults to reassess, never a negative label', () => {
    const s = summarisePlayer({ ...base, agePercentile: 0 }, mean, 20)
    expect(s.advice).toBe('reassess')
    expect(s.topPercentForAge).toBe(100)
  })
  it('ignores small age gaps', () => {
    expect(summarisePlayer({ ...base, ageMonths: 148, rankGain: 2, agePercentile: 40 }, mean, 20).advice).toBe('reassess')
  })
})
