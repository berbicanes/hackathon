/** Bosnian plural forms: 1 / 2–4 / 5+ (11–14 take the "many" form). */
export function bsPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/**
 * Plural form for a number as displayed, including decimals ("2,2" → few, "2,5" → many).
 * With decimals the noun agrees with the last digit shown: 2,1 bod · 2,2 boda · 2,5 bodova.
 */
export function bsPluralShown(shown: string, one: string, few: string, many: string): string {
  const digits = shown.replace(/\D/g, '')
  return bsPlural(Number(digits.slice(-2)), one, few, many)
}

export const enPlural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`
