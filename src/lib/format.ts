/** Format a p-value for display; 0 means it underflowed double precision. */
export function formatP(p: number): string {
  if (p === 0) return '< 10⁻³⁰⁰'
  if (p >= 0.001) return p.toFixed(3)
  const [mant, exp] = p.toExponential(1).split('e')
  const sup = exp.replace(/[-\d]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)])
  return `${mant} × 10${sup}`
}
