import { describe, expect, it } from 'vitest'
import { bsPlural, bsPluralShown, strings } from './i18n'
import { formatNumber } from './lib/format'

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
