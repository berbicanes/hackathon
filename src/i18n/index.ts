import { bs } from './bs'
import { en } from './en'
import type { Lang, Strings } from './types'

export type { CutoffRowId, Lang, Strings } from './types'

export const LANGS: Lang[] = ['bs', 'en']

export const strings: Record<Lang, Strings> = { bs, en }

/** Strings for the language the page is currently in (falls back to Bosnian, the default). */
export function currentStrings(): Strings {
  return document.documentElement.lang === 'en' ? en : bs
}
