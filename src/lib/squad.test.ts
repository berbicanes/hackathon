import { describe, expect, it } from 'vitest'
import { analyseSquad, compareSelections, hiddenTalents, recommendGroup, type Player } from './squad'
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
    expect(empty.fit).toEqual({ intercept: 0, slope: 0 })
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
