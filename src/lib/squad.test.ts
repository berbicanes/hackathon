import { describe, expect, it } from 'vitest'
import {
  ageInMonths,
  analyseSquad,
  birthQuarter,
  compareSelections,
  hiddenTalents,
  linearFit,
  type Player,
} from './squad'
import { csvCell, parseBirthDate, parseScore, parseSquadCsv, splitLine } from './csv'
import { sampleSquad, SAMPLE_REFERENCE_DATE } from './sample'

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)
const REF = d('2026-09-01')

describe('ageInMonths', () => {
  it('is ~12 months for a child born exactly a year earlier', () => {
    expect(ageInMonths(d('2025-09-01'), REF)).toBeCloseTo(12, 1)
  })
  it('gives an 11-month gap between 1 Jan and 1 Dec births of the same year', () => {
    const gap = ageInMonths(d('2014-01-01'), REF) - ageInMonths(d('2014-12-01'), REF)
    expect(gap).toBeCloseTo(11, 0)
  })
})

describe('birthQuarter', () => {
  it('maps months to selection-year quarters', () => {
    expect(birthQuarter(d('2014-01-01'))).toBe(1)
    expect(birthQuarter(d('2014-03-31'))).toBe(1)
    expect(birthQuarter(d('2014-04-01'))).toBe(2)
    expect(birthQuarter(d('2014-12-31'))).toBe(4)
  })
})

describe('linearFit', () => {
  it('recovers an exact line', () => {
    const fit = linearFit([1, 2, 3, 4], [5, 7, 9, 11])
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(3)
  })
  it('returns a flat line when there is no age spread', () => {
    const fit = linearFit([10, 10, 10], [1, 2, 3])
    expect(fit.slope).toBe(0)
    expect(fit.intercept).toBeCloseTo(2)
  })
  it('handles an empty squad', () => {
    expect(linearFit([], [])).toEqual({ intercept: 0, slope: 0 })
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

describe('hiddenTalents', () => {
  it('returns only players who climb, biggest gain first', () => {
    const result = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
    const talents = hiddenTalents(result.players, 3)
    expect(talents.length).toBeGreaterThan(0)
    talents.forEach((p) => expect(p.rankGain).toBeGreaterThan(0))
    for (let i = 1; i < talents.length; i++) {
      expect(talents[i - 1].rankGain).toBeGreaterThanOrEqual(talents[i].rankGain)
    }
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
  it('rejects future and implausible dates', () => {
    expect(parseBirthDate('2999-01-01')).toBeNull()
    expect(parseBirthDate('1890-01-01')).toBeNull()
    expect(parseBirthDate('31/04/2014')).toBeNull()
  })
  it('parses scores strictly', () => {
    expect(parseScore('12')).toBe(12)
    expect(parseScore('1e9')).toBeNull()
    expect(parseScore('=1+1')).toBeNull()
  })
  it('splits quoted fields with escaped quotes', () => {
    expect(splitLine('"a ""b""",c', ',')).toEqual(['a "b"', 'c'])
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
