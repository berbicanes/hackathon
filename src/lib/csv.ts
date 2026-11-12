/**
 * Minimal, defensive CSV handling for squad uploads.
 * Accepts comma or semicolon delimiters (Excel in many European locales uses ';'),
 * ISO dates (2014-03-21) or European dates (21.03.2014 / 21/03/2014),
 * and decimal commas in scores.
 */
import type { Player } from './squad'

export const MAX_FILE_BYTES = 200_000
export const MAX_ROWS = 300
const MAX_NAME_LENGTH = 80

export const CSV_TEMPLATE = 'name,birth_date,score\nPlayer A,2014-02-14,72\nPlayer B,2014-11-03,64\n'

export interface ParseIssue {
  line: number
  reason: 'columns' | 'name' | 'date' | 'score'
}

export interface ParseResult {
  players: Player[]
  issues: ParseIssue[]
  missingColumns: string[]
  truncated: boolean
}

function detectDelimiter(headerLine: string): ',' | ';' {
  const semis = (headerLine.match(/;/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return semis > commas ? ';' : ','
}

/** Split one CSV line, honouring double-quoted fields. */
export function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out.map((f) => f.trim())
}

/** Parse a date as UTC midnight. Returns null for anything implausible. */
export function parseBirthDate(raw: string): Date | null {
  const s = raw.trim()
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (match) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else {
    match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})\.?$/.exec(s)
    if (!match) return null
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  if (!valid || y < 1990 || date.getTime() > Date.now()) return null
  return date
}

export function parseScore(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && Math.abs(n) <= 1_000_000 ? n : null
}

/** Strip control characters and cap length; React escapes the rest on render. */
function cleanName(raw: string): string {
  const printable = [...raw].filter((ch) => {
    const code = ch.charCodeAt(0)
    return code >= 0x20 && code !== 0x7f
  })
  return printable.join('').trim().slice(0, MAX_NAME_LENGTH)
}

export function parseSquadCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const headerIndex = lines.findIndex((l) => l.trim() !== '')
  const result: ParseResult = { players: [], issues: [], missingColumns: [], truncated: false }
  if (headerIndex === -1) {
    result.missingColumns = ['name', 'birth_date', 'score']
    return result
  }
  const delimiter = detectDelimiter(lines[headerIndex])
  const header = splitLine(lines[headerIndex], delimiter).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const col = {
    name: header.indexOf('name'),
    birth: header.indexOf('birth_date'),
    score: header.indexOf('score'),
  }
  result.missingColumns = (
    [
      ['name', col.name],
      ['birth_date', col.birth],
      ['score', col.score],
    ] as const
  )
    .filter(([, i]) => i === -1)
    .map(([n]) => n)
  if (result.missingColumns.length) return result

  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    if (result.players.length >= MAX_ROWS) {
      result.truncated = true
      break
    }
    const line = i + 1
    const fields = splitLine(lines[i], delimiter)
    if (fields.length < header.length) {
      result.issues.push({ line, reason: 'columns' })
      continue
    }
    const name = cleanName(fields[col.name])
    if (!name) {
      result.issues.push({ line, reason: 'name' })
      continue
    }
    const birthDate = parseBirthDate(fields[col.birth])
    if (!birthDate) {
      result.issues.push({ line, reason: 'date' })
      continue
    }
    const score = parseScore(fields[col.score])
    if (score === null) {
      result.issues.push({ line, reason: 'score' })
      continue
    }
    result.players.push({ name, birthDate, score })
  }
  return result
}

/** Neutralise spreadsheet formula injection in exported cells. */
export function csvCell(value: string | number): string {
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
