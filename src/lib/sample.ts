/**
 * SYNTHETIC sample squad — invented names and numbers, generated deterministically.
 * Models a typical U12 squad: births skewed to early in the year, and a test score
 * that mixes underlying ability with a maturity bonus for being older.
 */
import type { Player } from './squad'

export const SAMPLE_REFERENCE_DATE = new Date(Date.UTC(2026, 8, 1))

const NAMES = [
  'Amar', 'Lejla', 'Tarik', 'Emina', 'Kenan', 'Ajla', 'Haris', 'Sara', 'Dino', 'Lana',
  'Adnan', 'Nejra', 'Edin', 'Iman', 'Vedad', 'Hana', 'Mirza', 'Asja', 'Benjamin', 'Ena',
]

// Small seeded PRNG (mulberry32) so the sample is identical on every load.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SAMPLE_SEED = 4
const MATURITY_PER_MONTH = 1.8

// Birth months with an early-year skew, like real academy intakes (0 = January).
const MONTHS = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 5, 6, 8, 9, 10, 11, 11]

export function sampleSquad(seed = SAMPLE_SEED, perMonth = MATURITY_PER_MONTH): Player[] {
  const rand = mulberry32(seed)
  return NAMES.map((name, i) => {
    const month = MONTHS[i]
    const day = 1 + Math.floor(rand() * 28)
    const birthDate = new Date(Date.UTC(2014, month, day))
    const ability = 50 + rand() * 30
    // Older children score higher on physical tests.
    const maturity = (11 - month) * perMonth
    const score = Math.round(ability + maturity)
    return { name, birthDate, score }
  })
}
