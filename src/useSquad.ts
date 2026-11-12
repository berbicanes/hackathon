import { useMemo, useState } from 'react'
import { decodeCsvBytes, MAX_FILE_BYTES, parseSquadCsv, type ParseIssue } from './lib/csv'
import { SAMPLE_REFERENCE_DATE, sampleSquad } from './lib/sample'
import { analyseSquad, type Player, type SquadAnalysis } from './lib/squad'

/** 'expanded' is the default recommendation; 'raw' and 'fair' are the side-by-side comparison. */
export type View = 'expanded' | 'raw' | 'fair'

export type LoadError =
  | { kind: 'tooLarge' }
  | { kind: 'unreadable' }
  | { kind: 'missing'; columns: string[] }
  /** The file was read, but not one row could be used. */
  | { kind: 'noRows' }

/** What was loaded last, for the confirmation line. `id` changes on every successful load. */
export interface LoadedInfo {
  id: number
  count: number
  /** Null for the synthetic sample. */
  fileName: string | null
}

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
  loadedInfo: LoadedInfo | null
  topN: number
  setTopN: (n: number) => void
  view: View
  setView: (v: View) => void
  higherIsBetter: boolean
  setHigherIsBetter: (v: boolean) => void
  cutoffMonth: number
  setCutoffMonth: (m: number) => void
  loadSample: () => void
  loadFile: (file: File) => Promise<void>
}

/** Squad data shared by the "Your squad" and "Decision" steps. Lives in memory only. */
export function useSquad(): SquadState {
  const [loaded, setLoaded] = useState<{ players: Player[]; synthetic: boolean } | null>(null)
  const [refDate, setRefDate] = useState(isoDay(todayUtc()))
  const [issues, setIssues] = useState<ParseIssue[]>([])
  const [error, setError] = useState<LoadError | null>(null)
  const [loadedInfo, setLoadedInfo] = useState<LoadedInfo | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [topN, setTopN] = useState(11)
  const [view, setView] = useState<View>('expanded')
  const [higherIsBetter, setHigherIsBetter] = useState(true)
  const [cutoffMonth, setCutoffMonth] = useState(1)

  const reference = useMemo(() => {
    const d = new Date(`${refDate}T00:00:00Z`)
    return Number.isNaN(d.getTime()) ? todayUtc() : d
  }, [refDate])

  const analysis = useMemo(
    () => (loaded && loaded.players.length ? analyseSquad(loaded.players, reference, { higherIsBetter, cutoffMonth }) : null),
    [loaded, reference, higherIsBetter, cutoffMonth],
  )

  const resetFeedback = () => {
    setIssues([])
    setError(null)
    setTruncated(false)
  }

  const applySquad = (players: Player[], synthetic: boolean, fileName: string | null) => {
    setLoaded({ players, synthetic })
    setLoadedInfo((previous) => ({ id: (previous?.id ?? 0) + 1, count: players.length, fileName }))
    setTopN(Math.max(1, Math.min(11, Math.floor(players.length / 2))))
  }

  const loadSample = () => {
    resetFeedback()
    setRefDate(isoDay(SAMPLE_REFERENCE_DATE))
    applySquad(sampleSquad(), true, null)
  }

  /**
   * Reads and analyses a chosen or dropped file. Every outcome is visible: a loaded
   * squad, or an error. Nothing fails silently.
   */
  const loadFile = async (file: File) => {
    resetFeedback()
    if (file.size > MAX_FILE_BYTES) {
      setError({ kind: 'tooLarge' })
      return
    }
    try {
      const text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))
      const result = parseSquadCsv(text)
      if (result.missingColumns.length) {
        setError({ kind: 'missing', columns: result.missingColumns })
        return
      }
      setIssues(result.issues)
      setTruncated(result.truncated)
      if (result.players.length === 0) {
        setError({ kind: 'noRows' })
        return
      }
      applySquad(result.players, false, file.name)
    } catch {
      setError({ kind: 'unreadable' })
    }
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
    loadedInfo,
    topN,
    setTopN,
    view,
    setView,
    higherIsBetter,
    setHigherIsBetter,
    cutoffMonth,
    setCutoffMonth,
    loadSample,
    loadFile,
  }
}
