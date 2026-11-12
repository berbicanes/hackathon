import { describe, expect, it } from 'vitest'
import { strings } from './index'
import { bsPlural, bsPluralShown } from './plural'
import { formatNumber, isoToDmy, parseDmy } from '../lib/format'

describe('formatNumber', () => {
  it('uses Bosnian and English separators', () => {
    expect(formatNumber(50100, 0, { decimal: ',', group: '.' })).toBe('50.100')
    expect(formatNumber(1234567.891, 2, { decimal: '.', group: ',' })).toBe('1,234,567.89')
    expect(formatNumber(-2.25, 1, { decimal: ',', group: '.' })).toBe('-2,3')
    expect(formatNumber(-0.01, 1, { decimal: '.', group: ',' })).toBe('0.0')
  })
})

describe('bsPlural', () => {
  it('follows 1 / 2–4 / 5+ with the 11–14 exception', () => {
    const m = (n: number) => bsPlural(n, 'mjesec', 'mjeseca', 'mjeseci')
    expect([1, 2, 4, 5, 11, 12, 21, 22, 25].map(m)).toEqual([
      'mjesec', 'mjeseca', 'mjeseca', 'mjeseci', 'mjeseci', 'mjeseci', 'mjesec', 'mjeseca', 'mjeseci',
    ])
  })
})

describe('dd.mm.yyyy dates', () => {
  it('round-trips and rejects impossible dates', () => {
    expect(isoToDmy('2026-02-14')).toBe('14.02.2026')
    expect(parseDmy('14.02.2026')).toBe('2026-02-14')
    expect(parseDmy('1.3.2026.')).toBe('2026-03-01')
    expect(parseDmy('31.02.2026')).toBeNull()
    expect(parseDmy('2026-02-14')).toBeNull()
    expect(parseDmy('14.02.26')).toBeNull()
  })
})

describe('step and decision wording', () => {
  it('names the three steps and counts them in both languages', () => {
    expect(strings.bs.stepOf(2, 3)).toBe('Korak 2 od 3')
    expect(strings.en.stepOf(2, 3)).toBe('Step 2 of 3')
    expect(Object.keys(strings.bs.stepNames)).toEqual(['problem', 'squad', 'decision'])
  })
  it('explains who comes in and who drops out in plain words, with Bosnian plurals', () => {
    expect(strings.bs.reasonYounger('6–7', 7)).toBe('mlađi od prosjeka ekipe za 6–7 mjeseci')
    expect(strings.bs.reasonOlder('2–4', 4)).toBe('stariji od prosjeka ekipe za 2–4 mjeseca')
    expect(strings.en.reasonYounger('1', 1)).toBe('1 month younger than the squad average')
    expect(strings.en.reasonOlder('2–4', 4)).toBe('2–4 months older than the squad average')
    expect(strings.bs.changes(3, 10)).toContain('3 od 10')
    expect(strings.en.changes(0, 10)).toContain('same 10')
  })
  it('keeps statistics jargon out of the coach-facing headline', () => {
    for (const t of [strings.bs, strings.en]) {
      const text = [t.biasPlain, t.problemLead, t.biasSub('25%', '18%', '1,8'), t.japanLine('2,4')].join(' ')
      expect(text).not.toMatch(/K1|K4|Q1|Q4|hi-kvadrat|chi-square|rezidual|residual/i)
      expect(t.japanLine('2,4')).toContain('2,4×')
    }
  })
  it('describes the scatter plot in words for screen readers', () => {
    expect(strings.bs.scatterSummary(20, 9, 'Ena, Benjamin')).toContain('Iznad linije je 9 od 20')
    expect(strings.bs.scatterSummary(20, 9, 'Ena, Benjamin')).toContain('Ena, Benjamin')
    expect(strings.en.scatterSummary(20, 9, '')).not.toContain('Labelled')
    expect(strings.bs.scatterCaption).toBe('Djeca iznad linije su bolja nego što je uobičajeno za njihovu starost.')
  })
  it('formats the remaining coach-facing messages', () => {
    for (const t of [strings.bs, strings.en]) {
      expect(t.skewSummary(14, 20)).toContain('14')
      expect(t.talentRank(16, 7)).toContain('16')
      expect(t.missingColumns('score')).toContain('score')
      expect(t.issues(2)).toContain('2')
      expect(t.issueLine(3, t.issueReason.date)).toContain('3')
      expect(t.truncated(300)).toContain('300')
      expect(t.monthsYounger(6)).toContain('6')
      expect(t.monthsOlder(2)).toContain('2')
      expect(t.ageYM(11, 8)).toContain('11')
      expect(t.openCard('Ena')).toContain('Ena')
      expect(t.biasKicker('50')).toContain('50')
      expect(t.pct(0.323, 1)).toMatch(/32[.,]3%/)
    }
  })
})

describe('bsPluralShown', () => {
  it('agrees with the last digit shown, including decimals', () => {
    const b = (s: string) => bsPluralShown(s, 'bod', 'boda', 'bodova')
    expect(['2,2', '1,8', '2,1', '0,5', '3', '2,0', '1,12', '21'].map(b)).toEqual([
      'boda', 'bodova', 'bod', 'bodova', 'boda', 'bodova', 'bodova', 'bod',
    ])
    expect(strings.bs.trend('2,2')).toContain('2,2 boda.')
  })
})

describe('translations', () => {
  it('have the same keys and list lengths in both languages', () => {
    const { bs, en } = strings
    expect(Object.keys(bs).sort()).toEqual(Object.keys(en).sort())
    for (const key of ['quarterLabels', 'months', 'monthsLong', 'method', 'limits', 'monday', 'privacySections'] as const) {
      expect(bs[key].length).toBe(en[key].length)
    }
  })
  it('label the same cut-off rows in both languages', () => {
    expect(Object.keys(strings.bs.cutoffRows)).toEqual(Object.keys(strings.en.cutoffRows))
    expect(strings.en.cutoffDate(9)).toBe('1 Sep')
    expect(strings.bs.cutoffDate(9)).toBe('1. sep')
  })
  it('formats dates without relying on browser locale data', () => {
    const d = new Date(Date.UTC(2014, 11, 2))
    expect(strings.bs.formatDate(d)).toBe('2. decembar 2014.')
    expect(strings.en.formatDate(d)).toBe('2 December 2014')
  })
})
