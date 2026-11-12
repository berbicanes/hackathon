/**
 * Runs every fixture in tests/fixtures/edge-cases/ through the whole pipeline a coach's
 * file goes through: parsing, analysis, selection, recommendation, warnings, player
 * cards and the explanation payload. Nothing here calls the network or the AI.
 *
 * Every fixture must (a) never throw, (b) produce only finite, consistent numbers, and
 * (c) meet the specific expectations it declares.
 */
import { describe, expect, it } from 'vitest'
import { parseExplainRequest } from '../../worker/src/schema'
import { strings } from '../i18n'
import { csvCell, parseSquadCsv } from './csv'
import { buildChildPayload, buildSquadPayload } from './explain'
import { summarisePlayer } from './playerCard'
import { ageAdvantage, analyseSquad, compareSelections, quarterLabels, recommendGroup } from './squad'
import { squadWarnings, type WarningKind } from './warnings'

interface EdgeCase {
  id: string
  description: string
  expected: string
  csv: string
  options: { referenceDate: string; topN: number; higherIsBetter: boolean; cutoffMonth: number }
  expect: {
    players?: number
    keep?: number
    issues?: string[]
    missingColumns?: string[]
    truncated?: boolean
    reliable?: boolean
    secondLook?: number
    warnings?: WarningKind[]
    warningsInclude?: WarningKind[]
    warningsExclude?: WarningKind[]
    quarters?: Record<string, number>
    names?: string[]
    rawFirstIsLowestScore?: boolean
    formulaSafe?: boolean
    fastMs?: number
  }
}

const modules = import.meta.glob<{ default: EdgeCase }>('../../tests/fixtures/edge-cases/*.json', { eager: true })
const cases = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))

/** Everything the app computes for one uploaded file. */
function run(c: EdgeCase) {
  const parsed = parseSquadCsv(c.csv)
  const reference = new Date(`${c.options.referenceDate}T00:00:00Z`)
  const analysis = analyseSquad(parsed.players, reference, c.options)
  const diff = compareSelections(analysis.players, c.options.topN)
  const group = recommendGroup(analysis.players, c.options.topN, analysis.fit, analysis.higherIsBetter)
  const warnings = squadWarnings(analysis, c.options.topN)
  return { parsed, analysis, diff, group, warnings }
}

describe('edge-case fixtures', () => {
  it('cover at least 30 cases, each with a description and an expected behaviour', () => {
    expect(cases.length).toBeGreaterThanOrEqual(30)
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length)
    for (const c of cases) {
      expect(c.description.length).toBeGreaterThan(10)
      expect(c.expected.length).toBeGreaterThan(10)
    }
  })

  describe.each(cases)('$id: $description', (c) => {
    it('never throws and stays internally consistent', () => {
      const { parsed, analysis, diff, group, warnings } = run(c)
      const n = analysis.players.length
      expect(n).toBe(parsed.players.length)

      // Finite numbers everywhere.
      for (const p of analysis.players) {
        for (const value of [p.ageMonths, p.score, p.residual, p.fairScore, p.agePercentile]) expect(Number.isFinite(value)).toBe(true)
        expect([1, 2, 3, 4]).toContain(p.quarter)
      }
      for (const value of [analysis.fit.slope, analysis.fit.intercept, analysis.meanAgeMonths]) expect(Number.isFinite(value)).toBe(true)
      const advantage = ageAdvantage(analysis.fit, analysis.higherIsBetter)
      if (advantage.low !== null && advantage.high !== null) expect(advantage.low).toBeLessThanOrEqual(advantage.high)

      // Ranks are a complete ordering, with no gaps and no duplicates.
      const oneToN = Array.from({ length: n }, (_, i) => i + 1)
      expect(analysis.players.map((p) => p.rawRank).sort((a, b) => a - b)).toEqual(oneToN)
      expect(analysis.players.map((p) => p.fairRank).sort((a, b) => a - b)).toEqual(oneToN)
      expect(analysis.quarterCounts.reduce((a, b) => a + b, 0)).toBe(n)

      // The recommendation never drops anyone and never lists a child twice.
      const places = Math.min(c.options.topN, n)
      expect(group.keep).toHaveLength(places)
      expect(group.keep.map((p) => p.id)).toEqual(diff.raw.map((p) => p.id))
      const kept = new Set(group.keep.map((p) => p.id))
      expect(group.secondLook.some((p) => kept.has(p.id))).toBe(false)
      expect(new Set(group.secondLook.map((p) => p.id)).size).toBe(group.secondLook.length)
      expect(group.borderline.length).toBeLessThanOrEqual(3)
      expect(group.size).toBe(places + group.secondLook.length)

      // No confident claim from thin data: fewer than 10 children is never "reliable",
      // and nobody is added when age gives no advantage.
      if (n < 10) expect(analysis.fit.reliable).toBe(false)
      if (advantage.perMonth <= 0) expect(group.secondLook).toEqual([])

      // Every warning has a message in both languages.
      for (const w of warnings) {
        for (const t of [strings.bs, strings.en]) expect(t.warning[w.kind](w.count).length).toBeGreaterThan(20)
      }

      // Player cards and labels work for every child.
      const labels = quarterLabels(strings.bs.months, analysis.cutoffMonth)
      const secondLook = new Set(group.secondLook.map((p) => p.id))
      for (const p of analysis.players) {
        const summary = summarisePlayer(p, analysis.meanAgeMonths, n, secondLook.has(p.id))
        expect(summary.advice === 'secondLook').toBe(secondLook.has(p.id))
        expect(summary.topPercentForAge).toBeGreaterThanOrEqual(1)
        expect(labels[p.quarter - 1]).toMatch(/–/)
      }

      // The explanation payload is either valid for the proxy or refused by it; it is never malformed text.
      if (n > 0) {
        const squadPayload = buildSquadPayload(analysis, group, 'bs')
        expect(JSON.stringify(squadPayload)).not.toMatch(/NaN|Infinity|undefined/)
        const first = buildChildPayload(analysis, group, analysis.players[0], 'en')
        const accepted = parseExplainRequest(JSON.parse(JSON.stringify(first)))
        if (accepted) expect(JSON.stringify(accepted)).not.toContain(analysis.players[0].name)
      }
    })

    it(`does what is expected: ${c.expected}`, () => {
      const started = performance.now()
      const { parsed, analysis, group, warnings } = run(c)
      const elapsed = performance.now() - started
      const e = c.expect
      const kinds = warnings.map((w) => w.kind)

      if (e.players !== undefined) expect(analysis.players).toHaveLength(e.players)
      if (e.keep !== undefined) expect(group.keep).toHaveLength(e.keep)
      if (e.issues) expect(parsed.issues.map((i) => i.reason)).toEqual(e.issues)
      if (e.missingColumns) expect(parsed.missingColumns).toEqual(e.missingColumns)
      else expect(parsed.missingColumns).toEqual([])
      expect(parsed.truncated).toBe(e.truncated ?? false)
      if (e.reliable !== undefined) expect(analysis.fit.reliable).toBe(e.reliable)
      if (e.secondLook !== undefined) expect(group.secondLook).toHaveLength(e.secondLook)
      if (e.warnings) expect([...kinds].sort()).toEqual([...e.warnings].sort())
      for (const kind of e.warningsInclude ?? []) expect(kinds).toContain(kind)
      for (const kind of e.warningsExclude ?? []) expect(kinds).not.toContain(kind)
      for (const [name, quarter] of Object.entries(e.quarters ?? {})) {
        expect(analysis.players.find((p) => p.name === name)?.quarter).toBe(quarter)
      }
      for (const name of e.names ?? []) expect(analysis.players.map((p) => p.name)).toContain(name)
      if (e.rawFirstIsLowestScore) {
        const lowest = Math.min(...analysis.players.map((p) => p.score))
        expect(analysis.players.find((p) => p.rawRank === 1)?.score).toBe(lowest)
      }
      if (e.formulaSafe) {
        const risky = analysis.players.find((p) => p.name.startsWith('='))
        expect(risky).toBeDefined()
        expect(csvCell(risky?.name ?? '')).toMatch(/^"?'=/)
      }
      if (e.fastMs !== undefined) expect(elapsed).toBeLessThan(e.fastMs)
    })
  })

  it('analyses 500 children directly in well under a second (the file limit is 300)', () => {
    const big = cases.find((c) => c.id.endsWith('five-hundred-players')) as EdgeCase
    const rows = big.csv.trim().split('\n').slice(1)
    expect(rows).toHaveLength(500)
    const players = rows.map((row) => {
      const [name, birth, score] = row.split(',')
      return { name, birthDate: new Date(`${birth}T00:00:00Z`), score: Number(score) }
    })
    const started = performance.now()
    const analysis = analyseSquad(players, new Date('2026-09-01T00:00:00Z'))
    const group = recommendGroup(analysis.players, 50, analysis.fit)
    expect(performance.now() - started).toBeLessThan(1000)
    expect(analysis.players).toHaveLength(500)
    expect(group.keep).toHaveLength(50)
  })
})

/** Number of fixtures, shown in the app and the docs; a test keeps the texts in step with it. */
describe('published edge-case count', () => {
  it('matches the number of fixtures', async () => {
    const { EDGE_CASES_TESTED } = await import('./edgeCaseCount')
    expect(EDGE_CASES_TESTED).toBe(cases.length)
  })
})
