import { describe, expect, it } from 'vitest'
import { bsPlural, strings } from './i18n'
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

describe('translations', () => {
  it('have the same keys and list lengths in both languages', () => {
    const { bs, en } = strings
    expect(Object.keys(bs).sort()).toEqual(Object.keys(en).sort())
    for (const key of ['quarterLabels', 'months', 'monthsLong', 'method', 'limits', 'monday'] as const) {
      expect(bs[key].length).toBe(en[key].length)
    }
  })
  it('formats dates without relying on browser locale data', () => {
    const d = new Date(Date.UTC(2014, 11, 2))
    expect(strings.bs.formatDate(d)).toBe('2. decembar 2014.')
    expect(strings.en.formatDate(d)).toBe('2 December 2014')
  })
})
