import { useMemo, useState } from 'react'
import { MAX_FILE_BYTES, parseSquadCsv, type ParseIssue } from './lib/csv'
import { SAMPLE_REFERENCE_DATE, sampleSquad } from './lib/sample'
import { analyseSquad, type Player, type SquadAnalysis } from './lib/squad'

/** 'expanded' is the default recommendation; 'raw' and 'fair' are the side-by-side comparison. */
export type View = 'expanded' | 'raw' | 'fair'

export type LoadError = { kind: 'tooLarge' } | { kind: 'unreadable' } | { kind: 'missing'; columns: string[] }

export const isoDay = (d: Date) => d.toISOString().slice(0, 10)

const todayUtc = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export interface SquadState {
  synthetic: boolean
  analysis: SquadAnalysis | null
  reference: Date
  refDate: string
  setRefDate: (iso: string) => void
  issues: ParseIssue[]
  truncated: boolean
  error: LoadError | null
  topN: number
  setTopN: (n: number) => void
  view: View
  setView: (v: View) => void
  loadSample: () => void
  loadFile: (file: File) => Promise<void>
}

/** Squad data shared by the "Your squad" and "Decision" steps. Lives in memory only. */
export function useSquad(): SquadState {
  const [loaded, setLoaded] = useState<{ players: Player[]; synthetic: boolean } | null>(null)
  const [refDate, setRefDate] = useState(isoDay(todayUtc()))
  const [issues, setIssues] = useState<ParseIssue[]>([])
  const [error, setError] = useState<LoadError | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [topN, setTopN] = useState(11)
  const [view, setView] = useState<View>('expanded')

  const reference = useMemo(() => {
    const d = new Date(`${refDate}T00:00:00Z`)
    return Number.isNaN(d.getTime()) ? todayUtc() : d
  }, [refDate])

  const analysis = useMemo(
    () => (loaded && loaded.players.length ? analyseSquad(loaded.players, reference) : null),
    [loaded, reference],
  )

  const resetFeedback = () => {
    setIssues([])
    setError(null)
    setTruncated(false)
  }

  const applySquad = (players: Player[], synthetic: boolean) => {
    setLoaded({ players, synthetic })
    setTopN(Math.max(1, Math.min(11, Math.floor(players.length / 2))))
  }

  const loadSample = () => {
    resetFeedback()
    setRefDate(isoDay(SAMPLE_REFERENCE_DATE))
    applySquad(sampleSquad(), true)
  }

  const loadFile = async (file: File) => {
    resetFeedback()
    if (file.size > MAX_FILE_BYTES) {
      setError({ kind: 'tooLarge' })
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setError({ kind: 'unreadable' })
      return
    }
    const result = parseSquadCsv(text)
    if (result.missingColumns.length) {
      setError({ kind: 'missing', columns: result.missingColumns })
      return
    }
    setIssues(result.issues)
    setTruncated(result.truncated)
    applySquad(result.players, false)
  }

  return {
    synthetic: loaded?.synthetic ?? false,
    analysis,
    reference,
    refDate,
    setRefDate,
    issues,
    truncated,
    error,
    topN,
    setTopN,
    view,
    setView,
    loadSample,
    loadFile,
  }
}
