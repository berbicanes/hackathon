/** Format a p-value for display; 0 means it underflowed double precision. */
export function formatP(p: number, decimal = '.'): string {
  if (p === 0) return '< 10⁻³⁰⁰'
  if (p >= 0.001) return p.toFixed(3).replace('.', decimal)
  const [mant, exp] = p.toExponential(1).split('e')
  const sup = exp.replace(/[-\d]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)])
  return `${mant.replace('.', decimal)} × 10${sup}`
}

export interface Separators {
  decimal: string
  group: string
}

/** Locale-independent number formatting (browser ICU data for Bosnian is often missing). */
export function formatNumber(value: number, digits: number, sep: Separators): string {
  const [int, frac] = Math.abs(value).toFixed(digits).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep.group)
  const sign = value < 0 && Number(`${int}.${frac ?? 0}`) !== 0 ? '-' : ''
  return `${sign}${grouped}${frac ? sep.decimal + frac : ''}`
}
