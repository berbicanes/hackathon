import { describe, expect, it } from 'vitest'
import {
  ageAdvantage,
  analyseSquad,
  compareSelections,
  olderHalfLabel,
  quarterLabels,
  recommendGroup,
  type Player,
} from './squad'
import { csvCell, parseSquadCsv } from './csv'
import { sampleSquad, SAMPLE_REFERENCE_DATE } from './sample'

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)
const REF = d('2026-09-01')

const squadOf = (...births: string[]): Player[] =>
  births.map((iso, i) => ({ name: `P${i}`, birthDate: d(iso), score: 50 + i }))

describe('age in months (through analyseSquad)', () => {
  it('is ~12 months for a child born exactly a year earlier', () => {
    expect(analyseSquad(squadOf('2025-09-01'), REF).players[0].ageMonths).toBeCloseTo(12, 1)
  })
  it('gives an 11-month gap between 1 Jan and 1 Dec births of the same year', () => {
    const [jan, dec] = analyseSquad(squadOf('2014-01-01', '2014-12-01'), REF).players
    expect(jan.ageMonths - dec.ageMonths).toBeCloseTo(11, 0)
  })
})

describe('birth quarter (through analyseSquad)', () => {
  it('maps months to selection-year quarters', () => {
    const { players } = analyseSquad(squadOf('2014-01-01', '2014-03-31', '2014-04-01', '2014-12-31'), REF)
    expect(players.map((p) => p.quarter)).toEqual([1, 1, 2, 4])
  })
})

describe('age trend (through analyseSquad)', () => {
  it('recovers an exact line', () => {
    // Scores are an exact linear function of age in months: score = 3 + 2 × age.
    const base = analyseSquad(squadOf('2014-01-10', '2014-04-20', '2014-08-05', '2014-12-01'), REF)
    const exact = base.players.map((p) => ({ name: p.name, birthDate: p.birthDate, score: 3 + 2 * p.ageMonths }))
    const { fit, players } = analyseSquad(exact, REF)
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(3)
    for (const p of players) expect(p.residual).toBeCloseTo(0)
  })
  it('returns a flat line when there is no age spread', () => {
    const same = [1, 2, 3].map((score, i) => ({ name: `S${i}`, birthDate: d('2014-05-05'), score }))
    const { fit, players } = analyseSquad(same, REF)
    expect(fit.slope).toBe(0)
    expect(fit.intercept).toBeCloseTo(2)
    expect(players.map((p) => p.fairScore)).toEqual([1, 2, 3])
  })
  it('handles an empty squad', () => {
    const empty = analyseSquad([], REF)
    expect(empty.fit).toMatchObject({ intercept: 0, slope: 0, reliable: false })
    expect(empty.players).toEqual([])
  })
})

// Score falls ~1 point per month younger; the December child is clearly above that trend.
const SQUAD: Player[] = [
    { name: 'Jan', birthDate: d('2014-01-15'), score: 80 },
    { name: 'Feb', birthDate: d('2014-02-15'), score: 79 },
    { name: 'Apr', birthDate: d('2014-04-15'), score: 77 },
    { name: 'Jul', birthDate: d('2014-07-15'), score: 74 },
    { name: 'Oct', birthDate: d('2014-10-15'), score: 71 },
    { name: 'Dec', birthDate: d('2014-12-15'), score: 72 },
]

describe('analyseSquad (age adjustment)', () => {
  const squad = SQUAD
  const result = analyseSquad(squad, REF)
  const byName = (n: string) => result.players.find((p) => p.name === n)!

  it('residuals sum to ~0 (OLS property)', () => {
    const sum = result.players.reduce((a, p) => a + p.residual, 0)
    expect(sum).toBeCloseTo(0, 6)
  })
  it('older children score higher in this squad (positive slope per month)', () => {
    expect(result.fit.slope).toBeGreaterThan(0)
  })
  it('the youngest child ranks near the bottom on raw score but first once age is adjusted', () => {
    expect(byName('Dec').rawRank).toBe(5)
    expect(byName('Dec').fairRank).toBe(1)
    expect(byName('Dec').rankGain).toBe(4)
    expect(byName('Dec').agePercentile).toBe(100)
  })
  it('fair score stays on the original scale (same mean as raw)', () => {
    const meanRaw = squad.reduce((a, p) => a + p.score, 0) / squad.length
    const meanFair = result.players.reduce((a, p) => a + p.fairScore, 0) / squad.length
    expect(meanFair).toBeCloseTo(meanRaw, 6)
  })
  it('counts birth quarters', () => {
    expect(result.quarterCounts).toEqual([2, 1, 1, 2])
  })
  it('does not change ranks when scores do not depend on age', () => {
    const flat = analyseSquad(
      [
        { name: 'A', birthDate: d('2014-01-01'), score: 60 },
        { name: 'B', birthDate: d('2014-12-01'), score: 60 },
        { name: 'C', birthDate: d('2014-06-01'), score: 90 },
      ],
      REF,
    )
    const c = flat.players.find((p) => p.name === 'C')!
    expect(c.rawRank).toBe(1)
    expect(c.fairRank).toBe(1)
  })
})

describe('compareSelections', () => {
  const result = analyseSquad(SQUAD, REF)

  it('selects exactly N players in both modes', () => {
    const diff = compareSelections(result.players, 2)
    expect(diff.raw).toHaveLength(2)
    expect(diff.fair).toHaveLength(2)
  })
  it('reports exactly which children change, symmetrically', () => {
    const diff = compareSelections(result.players, 2)
    expect(diff.raw.map((p) => p.name)).toEqual(['Jan', 'Feb'])
    expect(diff.fair.map((p) => p.name)).toEqual(['Dec', 'Jan'])
    expect(diff.gained.map((p) => p.name)).toEqual(['Dec'])
    expect(diff.lost.map((p) => p.name)).toEqual(['Feb'])
    expect(diff.gained).toHaveLength(diff.lost.length)
    const fairNames = new Set(diff.fair.map((p) => p.name))
    diff.lost.forEach((p) => expect(fairNames.has(p.name)).toBe(false))
  })
  it('clamps N to the squad size and to zero', () => {
    expect(compareSelections(result.players, 99).raw).toHaveLength(6)
    expect(compareSelections(result.players, 99).gained).toHaveLength(0)
    expect(compareSelections(result.players, -3).raw).toHaveLength(0)
  })
})

describe('selection-year cut-off (1 January, 1 September, 1 April)', () => {
  const births = ['2014-01-15', '2014-03-31', '2014-04-01', '2014-08-31', '2014-09-01', '2014-12-10']
  const quarters = (cutoffMonth?: number) => analyseSquad(squadOf(...births), REF, { cutoffMonth }).players.map((p) => p.quarter)

  it('defaults to 1 January', () => {
    expect(quarters()).toEqual([1, 1, 2, 3, 3, 4])
    expect(quarters(1)).toEqual(quarters())
  })
  it('counts quarters from 1 September: September is the oldest, August the youngest', () => {
    expect(quarters(9)).toEqual([2, 3, 3, 4, 1, 2])
  })
  it('counts quarters from 1 April: April is the oldest, March the youngest', () => {
    expect(quarters(4)).toEqual([4, 4, 1, 2, 2, 3])
  })
  it('moves the squad chart counts with the cut-off', () => {
    expect(analyseSquad(squadOf(...births), REF, { cutoffMonth: 9 }).quarterCounts).toEqual([1, 2, 2, 1])
    expect(analyseSquad(squadOf(...births), REF, { cutoffMonth: 9 }).cutoffMonth).toBe(9)
  })
  it('does not change ages, ranks or fair scores, only the labels', () => {
    const jan = analyseSquad(SQUAD, REF)
    const sep = analyseSquad(SQUAD, REF, { cutoffMonth: 9 })
    const core = (a: typeof jan) => a.players.map((p) => [p.ageMonths, p.rawRank, p.fairRank, p.fairScore])
    expect(core(sep)).toEqual(core(jan))
  })
  it('labels quarters and the older half in selection-year order', () => {
    const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    expect(quarterLabels(en, 1)).toEqual(['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'])
    expect(quarterLabels(en, 9)).toEqual(['Sep–Nov', 'Dec–Feb', 'Mar–May', 'Jun–Aug'])
    expect(quarterLabels(en, 4)).toEqual(['Apr–Jun', 'Jul–Sep', 'Oct–Dec', 'Jan–Mar'])
    expect(olderHalfLabel(en, 1)).toBe('Jan–Jun')
    expect(olderHalfLabel(en, 9)).toBe('Sep–Feb')
    expect(olderHalfLabel(en, 4)).toBe('Apr–Sep')
  })
})

describe('borderline children ("Na granici")', () => {
  const sample = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
  const halfWidth = ((sample.fit.slopeHigh as number) - (sample.fit.slopeLow as number)) / 2
  const qualifies = (p: (typeof sample.players)[number], last: (typeof sample.players)[number]) =>
    last.residual - p.residual <= halfWidth * Math.abs(p.ageMonths - last.ageMonths)

  it('takes the children directly below the last place while the gap is within the uncertainty', () => {
    expect(recommendGroup(sample.players, 9, sample.fit).borderline.map((p) => p.name)).toEqual(['Hana'])
    expect(recommendGroup(sample.players, 8, sample.fit).borderline.map((p) => p.name)).toEqual(['Benjamin', 'Hana', 'Asja'])
  })
  it('stops at the first child who does not qualify: nobody at 10 places, where Asja is next and too far', () => {
    const last = compareSelections(sample.players, 10).fair[9]
    const asja = sample.players.find((p) => p.name === 'Asja') as (typeof sample.players)[number]
    expect(asja.fairRank).toBe(11)
    expect(qualifies(asja, last)).toBe(false)
    // Adnan (rank 12) would qualify on his own, but he is below a child who does not.
    const adnan = sample.players.find((p) => p.name === 'Adnan') as (typeof sample.players)[number]
    expect(qualifies(adnan, last)).toBe(true)
    expect(recommendGroup(sample.players, 10, sample.fit).borderline).toEqual([])
  })
  it('is monotonic for every group size: never a borderline child below a non-borderline one, at most 3', () => {
    for (let n = 1; n < sample.players.length; n++) {
      const diff = compareSelections(sample.players, n)
      const group = recommendGroup(sample.players, n, sample.fit)
      const inGroup = new Set([...diff.raw, ...diff.fair].map((p) => p.id))
      const below = sample.players.filter((p) => !inGroup.has(p.id)).sort((a, b) => a.fairRank - b.fairRank)
      // The borderline children are exactly the first k children below the line.
      expect(group.borderline.map((p) => p.id)).toEqual(below.slice(0, group.borderline.length).map((p) => p.id))
      expect(group.borderline.length).toBeLessThanOrEqual(3)
      const last = diff.fair[diff.fair.length - 1]
      group.borderline.forEach((p) => expect(qualifies(p, last)).toBe(true))
      // The walk stopped because of the cap or because the next child does not qualify.
      const next = below[group.borderline.length]
      if (next && group.borderline.length < 3) expect(qualifies(next, last)).toBe(false)
    }
  })
  it('keeps one list: age-adjusted entrants first, then borderline, nobody twice, nobody already selected', () => {
    const group = recommendGroup(sample.players, 8, sample.fit)
    expect(group.secondLook.map((p) => p.name)).toEqual(['Ena', 'Benjamin', 'Hana', 'Asja'])
    expect(new Set(group.secondLook.map((p) => p.id)).size).toBe(group.secondLook.length)
    const kept = new Set(group.keep.map((p) => p.id))
    expect(group.secondLook.some((p) => kept.has(p.id))).toBe(false)
    expect(group.size).toBe(12)
    expect(recommendGroup(sample.players, 10, sample.fit).secondLook.map((p) => p.name)).toEqual(['Ena', 'Benjamin', 'Hana'])
  })
  it('calls nobody borderline when the trend has no interval', () => {
    const tiny = analyseSquad(squadOf('2014-01-01', '2014-06-01'), REF)
    expect(recommendGroup(tiny.players, 1, tiny.fit).borderline).toEqual([])
    expect(recommendGroup(sample.players, 8).borderline).toEqual([])
  })
})

describe('test direction (lower score is better, e.g. sprint in seconds)', () => {
  // Sprint times: older children are faster; the December child is fast for their age.
  const SPRINT: Player[] = SQUAD.map((p) => ({ ...p, score: 20 - p.score / 10 }))
  const higher = analyseSquad(SQUAD, REF)
  const lower = analyseSquad(SPRINT, REF, { higherIsBetter: false })

  it('ranks the smallest time first', () => {
    const fastest = [...SPRINT].sort((a, b) => a.score - b.score)[0]
    expect(lower.players.find((p) => p.rawRank === 1)?.name).toBe(fastest.name)
    expect(lower.higherIsBetter).toBe(false)
  })
  it('gives exactly the same ranks as the mirrored higher-is-better test', () => {
    const ranks = (a: typeof higher) => a.players.map((p) => [p.name, p.rawRank, p.fairRank, p.rankGain, p.agePercentile])
    expect(ranks(lower)).toEqual(ranks(higher))
  })
  it('keeps "better than expected for age" positive and the fair score on the original scale', () => {
    const dec = lower.players.find((p) => p.name === 'Dec')
    expect(dec?.residual).toBeGreaterThan(0)
    // Faster than expected for their age, so the age-adjusted time is lower than the measured one.
    expect(dec?.fairScore as number).toBeLessThan(dec?.score as number)
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(mean(lower.players.map((p) => p.fairScore))).toBeCloseTo(mean(SPRINT.map((p) => p.score)))
  })
  it('reports the age advantage as positive in both directions, with ordered interval ends', () => {
    const up = ageAdvantage(higher.fit, true)
    const down = ageAdvantage(lower.fit, false)
    expect(lower.fit.slope).toBeLessThan(0)
    expect(down.perMonth).toBeGreaterThan(0)
    expect(down.perMonth).toBeCloseTo(up.perMonth / 10)
    expect(down.low as number).toBeLessThan(down.high as number)
    expect(up).toEqual({ perMonth: higher.fit.slope, low: higher.fit.slopeLow, high: higher.fit.slopeHigh })
  })
  it('selects and recommends on the right side', () => {
    const group = recommendGroup(lower.players, 3)
    expect(group.keep.map((p) => p.name)).toEqual(recommendGroup(higher.players, 3).keep.map((p) => p.name))
    expect(group.secondLook.map((p) => p.name)).toEqual(recommendGroup(higher.players, 3).secondLook.map((p) => p.name))
  })
})

describe('reliability of the age trend (95% interval for the slope)', () => {
  it('is reliable for the sample squad, with the estimate inside its interval', () => {
    const { fit } = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
    expect(fit.reliable).toBe(true)
    expect(fit.slopeLow).toBeGreaterThan(0)
    expect(fit.slopeLow as number).toBeLessThan(fit.slope)
    expect(fit.slopeHigh as number).toBeGreaterThan(fit.slope)
  })
  it('matches a hand-computed interval', () => {
    // x = 0..4, y = 1, 3, 2, 5, 4: slope 0.8, SSE 3.6, df 3, se = sqrt(1.2 / 10), t = 3.182.
    const squad = [1, 3, 2, 5, 4].map((score, i) => ({ name: `P${i}`, birthDate: d(`2014-0${5 - i}-15`), score }))
    const { fit, players } = analyseSquad(squad, REF)
    const ages = players.map((p) => p.ageMonths)
    const meanAge = ages.reduce((a, b) => a + b, 0) / 5
    const sxx = ages.reduce((a, x) => a + (x - meanAge) ** 2, 0)
    const sse = players.reduce((a, p) => a + (p.score - (fit.intercept + fit.slope * p.ageMonths)) ** 2, 0)
    const margin = 3.182 * Math.sqrt(sse / 3 / sxx)
    expect(fit.slopeLow as number).toBeCloseTo(fit.slope - margin, 6)
    expect(fit.slopeHigh as number).toBeCloseTo(fit.slope + margin, 6)
  })
  it('is not reliable when the interval includes zero', () => {
    // Twelve children whose scores do not follow age at all.
    const scores = [50, 62, 48, 70, 55, 66, 49, 71, 53, 64, 51, 68]
    const squad = scores.map((score, i) => ({ name: `N${i}`, birthDate: d(`2014-${String(i + 1).padStart(2, '0')}-10`), score }))
    const { fit } = analyseSquad(squad, REF)
    expect(fit.slopeLow as number).toBeLessThan(0)
    expect(fit.slopeHigh as number).toBeGreaterThan(0)
    expect(fit.reliable).toBe(false)
  })
  it('is not reliable with fewer than 10 children, even with a perfect trend', () => {
    const { fit } = analyseSquad(SQUAD, REF)
    expect(SQUAD.length).toBeLessThan(10)
    expect(fit.slope).toBeGreaterThan(0)
    expect(fit.reliable).toBe(false)
  })
  it('gives no interval when it cannot be estimated', () => {
    expect(analyseSquad(squadOf('2014-01-01', '2014-06-01'), REF).fit).toMatchObject({ slopeLow: null, slopeHigh: null, reliable: false })
  })
})

describe('recommendGroup (second look, not swap)', () => {
  const { players } = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
  it('keeps everyone from the raw top N and adds the age-adjusted entrants', () => {
    const diff = compareSelections(players, 10)
    const group = recommendGroup(players, 10)
    expect(group.keep.map((p) => p.id)).toEqual(diff.raw.map((p) => p.id))
    expect(group.secondLook.map((p) => p.id)).toEqual(diff.gained.map((p) => p.id))
    expect(group.size).toBe(10 + diff.gained.length)
    // Nobody who is in on raw score is dropped, including those the swap view would drop.
    const kept = new Set(group.keep.map((p) => p.id))
    for (const p of diff.lost) expect(kept.has(p.id)).toBe(true)
  })
  it('never lists a child in both parts', () => {
    const group = recommendGroup(players, 10)
    const kept = new Set(group.keep.map((p) => p.id))
    expect(group.secondLook.some((p) => kept.has(p.id))).toBe(false)
  })
  it('adds nobody when scores do not depend on age', () => {
    const flat = analyseSquad(
      [
        { name: 'A', birthDate: d('2014-01-01'), score: 5 },
        { name: 'B', birthDate: d('2014-01-01'), score: 4 },
        { name: 'C', birthDate: d('2014-01-01'), score: 3 },
        { name: 'D', birthDate: d('2014-01-01'), score: 2 },
      ],
      REF,
    )
    expect(recommendGroup(flat.players, 2)).toMatchObject({ secondLook: [], size: 2 })
  })
})

describe('one set of highlighted children', () => {
  it('is the second-look list, in age-adjusted rank order, and only children outside the raw top N', () => {
    const { players } = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
    const group = recommendGroup(players, 10)
    expect(group.secondLook.map((p) => p.name)).toEqual(['Ena', 'Benjamin', 'Hana'])
    const ranks = group.secondLook.map((p) => p.fairRank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    group.secondLook.forEach((p) => expect(p.rawRank).toBeGreaterThan(10))
    expect(group.borderline).toEqual([])
  })
  it('does not highlight a child who gains rank but stays outside the list (Asja)', () => {
    const { players } = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
    const asja = players.find((p) => p.name === 'Asja')
    expect(asja?.rankGain).toBeGreaterThan(0)
    expect(recommendGroup(players, 10).secondLook.some((p) => p.name === 'Asja')).toBe(false)
  })
})

describe('sample squad', () => {
  it('is deterministic and early-skewed like a real intake', () => {
    expect(sampleSquad()).toEqual(sampleSquad())
    const q = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE).quarterCounts
    expect(q[0]).toBeGreaterThan(q[3])
  })
})

describe('CSV parsing', () => {
  it('parses comma CSV with ISO dates', () => {
    const r = parseSquadCsv('name,birth_date,score\nAmar,2014-02-14,72\n')
    expect(r.players).toHaveLength(1)
    expect(r.players[0].birthDate.toISOString().slice(0, 10)).toBe('2014-02-14')
  })
  it('parses semicolon CSV with European dates and decimal commas', () => {
    const r = parseSquadCsv('﻿Name;Birth Date;Score\r\n"Hodžić, Amar";14.02.2014.;7,5\r\n')
    expect(r.missingColumns).toEqual([])
    expect(r.players[0]).toMatchObject({ name: 'Hodžić, Amar', score: 7.5 })
  })
  it('reports bad rows instead of failing', () => {
    const r = parseSquadCsv('name,birth_date,score\nA,2014-02-30,5\nB,2014-01-01,abc\n,2014-01-01,3\nC,2014-01-01,4\n')
    expect(r.players.map((p) => p.name)).toEqual(['C'])
    expect(r.issues.map((i) => i.reason)).toEqual(['date', 'score', 'name'])
  })
  it('flags missing columns', () => {
    expect(parseSquadCsv('name,dob\nA,2014-01-01').missingColumns).toEqual(['birth_date', 'score'])
    expect(parseSquadCsv('').missingColumns).toHaveLength(3)
  })
  const reasons = (rows: string) => parseSquadCsv(`name,birth_date,score\n${rows}`).issues.map((i) => i.reason)
  it('rejects future and implausible dates', () => {
    expect(reasons('A,2999-01-01,5\nB,1890-01-01,5\nC,31/04/2014,5\n')).toEqual(['date', 'date', 'date'])
  })
  it('parses scores strictly', () => {
    const r = parseSquadCsv('name,birth_date,score\nA,2014-01-01,12\nB,2014-01-01,1e9\nC,2014-01-01,=1+1\n')
    expect(r.players.map((p) => p.score)).toEqual([12])
    expect(r.issues.map((i) => i.reason)).toEqual(['score', 'score'])
  })
  it('splits quoted fields with escaped quotes', () => {
    const r = parseSquadCsv('name,birth_date,score\n"a ""b"", c",2014-01-01,5\n')
    expect(r.players[0].name).toBe('a "b", c')
  })
  it('neutralises formula injection on export', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('Amar')).toBe('Amar')
  })
})

describe('formatP', () => {
  it('formats tiny, small and ordinary p-values', async () => {
    const { formatP } = await import('./format')
    expect(formatP(0)).toBe('< 10⁻³⁰⁰')
    expect(formatP(7.18e-4)).toBe('7.2 × 10⁻⁴')
    expect(formatP(0.961)).toBe('0.961')
  })
  it('strips control characters from names', () => {
    expect(parseSquadCsv('name,birth_date,score\nA\u0007mar,2014-01-01,5').players[0].name).toBe('Amar')
  })
})
