import { useId, useMemo, useState, type ChangeEvent } from 'react'
import type { Strings } from '../i18n'
import { CSV_TEMPLATE, MAX_FILE_BYTES, MAX_ROWS, csvCell, parseSquadCsv, type ParseIssue } from '../lib/csv'
import { SAMPLE_REFERENCE_DATE, sampleSquad } from '../lib/sample'
import { analyseSquad, compareSelections, hiddenTalents, type AnalysedPlayer, type Player } from '../lib/squad'
import { BarChart } from './BarChart'

type View = 'raw' | 'fair'

interface Loaded {
  players: Player[]
  synthetic: boolean
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const todayUtc = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function QuarterBadge({ q, t }: { q: number; t: Strings }) {
  const tone = q === 1 ? 'early' : q === 4 ? 'late' : 'neutral'
  return (
    <span className={`pill pill--${tone}`} title={t.quarterLabels[q - 1]}>
      {t.quarterShort[q - 1]}
      {q === 1 ? ' ▲' : q === 4 ? ' ▼' : ''}
    </span>
  )
}

export function YourSquad({ t }: { t: Strings }) {
  const fileId = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [refDate, setRefDate] = useState(isoDay(todayUtc()))
  const [issues, setIssues] = useState<ParseIssue[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [topN, setTopN] = useState(11)
  const [view, setView] = useState<View>('fair')

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
    setMessage(null)
    setTruncated(false)
  }

  const applySquad = (players: Player[], synthetic: boolean) => {
    setLoaded({ players, synthetic })
    setTopN(Math.max(1, Math.min(11, Math.floor(players.length / 2))))
  }

  const onSample = () => {
    resetFeedback()
    setRefDate(isoDay(SAMPLE_REFERENCE_DATE))
    applySquad(sampleSquad(), true)
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    resetFeedback()
    if (file.size > MAX_FILE_BYTES) {
      setMessage(t.fileTooLarge)
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setMessage(t.fileUnreadable)
      return
    }
    const result = parseSquadCsv(text)
    if (result.missingColumns.length) {
      setMessage(t.missingColumns(result.missingColumns.join(', ')))
      return
    }
    setIssues(result.issues)
    setTruncated(result.truncated)
    applySquad(result.players, false)
  }

  const onDownloadResults = () => {
    if (!analysis) return
    const header = ['name', 'birth_date', 'birth_quarter', 'age_months', 'raw_score', 'fair_score', 'raw_rank', 'fair_rank']
    const rows = [...analysis.players]
      .sort((a, b) => a.fairRank - b.fairRank)
      .map((p) =>
        [
          p.name,
          isoDay(p.birthDate),
          `Q${p.quarter}`,
          p.ageMonths.toFixed(1),
          p.score,
          p.fairScore.toFixed(1),
          p.rawRank,
          p.fairRank,
        ]
          .map(csvCell)
          .join(','),
      )
    downloadText('late-bloomers-results.csv', [header.join(','), ...rows].join('\n') + '\n')
  }

  return (
    <div className="stack">
      <section className="card" aria-labelledby="squad-title">
        <h2 id="squad-title">{t.squadTitle}</h2>
        <p>{t.squadIntro}</p>
        <p className="privacy" role="note">
          <span aria-hidden="true">🔒</span> {t.privacy}
        </p>
        <div className="actions">
          <label htmlFor={fileId} className="button button--primary">
            {t.upload}
          </label>
          <input id={fileId} className="sr-only" type="file" accept=".csv,text/csv" onChange={onFile} />
          <button type="button" className="button" onClick={onSample}>
            {t.loadSample}
          </button>
          <button type="button" className="button button--ghost" onClick={() => downloadText('late-bloomers-template.csv', CSV_TEMPLATE)}>
            {t.downloadTemplate}
          </button>
        </div>
        <p className="help">{t.csvHelp}</p>
        <div className="field">
          <label htmlFor="ref-date">{t.assessmentDate}</label>
          <input id="ref-date" type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
        </div>
        {message && (
          <p role="alert" className="alert">
            {message}
          </p>
        )}
        {(issues.length > 0 || truncated) && (
          <div role="status" className="alert alert--soft">
            {issues.length > 0 && (
              <>
                <p>{t.issues(issues.length)}</p>
                <ul>
                  {issues.slice(0, 8).map((i) => (
                    <li key={i.line}>{t.issueLine(i.line, t.issueReason[i.reason])}</li>
                  ))}
                </ul>
              </>
            )}
            {truncated && <p>{t.truncated(MAX_ROWS)}</p>}
          </div>
        )}
      </section>

      {loaded?.synthetic && (
        <p className="synthetic" role="note">
          {t.syntheticBanner}
        </p>
      )}

      {analysis && <SquadResults t={t} analysis={analysis} topN={topN} setTopN={setTopN} view={view} setView={setView} onDownload={onDownloadResults} />}
    </div>
  )
}

interface ResultsProps {
  t: Strings
  analysis: ReturnType<typeof analyseSquad>
  topN: number
  setTopN: (n: number) => void
  view: View
  setView: (v: View) => void
  onDownload: () => void
}

function SquadResults({ t, analysis, topN, setTopN, view, setView, onDownload }: ResultsProps) {
  const { players, quarterCounts, fit, meanAgeMonths } = analysis
  const n = players.length
  const diff = compareSelections(players, topN)
  const talents = hiddenTalents(players, 3)
  const gainedIds = new Set(diff.gained.map((p) => p.id))
  const lostIds = new Set(diff.lost.map((p) => p.id))
  const selectedIds = new Set((view === 'raw' ? diff.raw : diff.fair).map((p) => p.id))
  const ordered = [...players].sort((a, b) => (view === 'raw' ? a.rawRank - b.rawRank : a.fairRank - b.fairRank))
  const firstHalf = quarterCounts[0] + quarterCounts[1]

  const ageText = (p: AnalysedPlayer) => {
    const months = Math.floor(p.ageMonths)
    return t.ageYM(Math.floor(months / 12), months % 12)
  }
  const relAge = (p: AnalysedPlayer) => {
    const diffM = Math.round(meanAgeMonths - p.ageMonths)
    return diffM >= 0 ? t.monthsYounger(diffM) : t.monthsOlder(-diffM)
  }

  return (
    <>
      {n < 10 && <p className="alert alert--soft">{n < 4 ? t.tooFew : t.smallSquad}</p>}

      <div className="grid-2">
        <section className="card" aria-labelledby="skew-title">
          <h2 id="skew-title">{t.skewTitle}</h2>
          <p className="big-line">{t.skewSummary(firstHalf, n)}</p>
          <p className="help">{t.skewNote}</p>
          <BarChart
            title={t.skewChart}
            bars={quarterCounts.map((c, i) => ({
              label: t.quarterLabels[i],
              value: n ? c / n : 0,
              display: `${c}`,
              tone: i === 0 ? 'early' : i === 3 ? 'late' : 'neutral',
              marker: i === 0 ? `▲ ${t.earlyBorn}` : i === 3 ? `▼ ${t.lateBorn}` : undefined,
            }))}
            expected={0.25}
            expectedLabel={t.expectedLine}
          />
        </section>

        <section className="card" aria-labelledby="talent-title">
          <h2 id="talent-title">{t.talentTitle}</h2>
          <p>{t.talentIntro}</p>
          {talents.length === 0 ? (
            <p className="help">{t.talentNone}</p>
          ) : (
            <ol className="talents">
              {talents.map((p) => (
                <li key={p.id}>
                  <div className="talents__head">
                    <strong>{p.name}</strong> <QuarterBadge q={p.quarter} t={t} />
                  </div>
                  <span className="talents__rank">{t.talentRank(p.rawRank, p.fairRank)}</span>
                  <span className="help">{relAge(p)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="help">{fit.slope > 0.05 ? t.trend(fit.slope.toFixed(1)) : t.trendNone}</p>
        </section>
      </div>

      {n >= 4 && (
        <section className="card" aria-labelledby="selection-title">
          <h2 id="selection-title">{t.selectionTitle}</h2>
          <p>{t.selectionIntro}</p>
          <div className="controls">
            <div className="field">
              <label htmlFor="top-n">{t.topN}</label>
              <input
                id="top-n"
                type="number"
                min={1}
                max={n}
                value={topN}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) setTopN(Math.max(1, Math.min(n, Math.round(v))))
                }}
              />
            </div>
            <div className="segmented" role="group" aria-label={t.selectionTitle}>
              {(['raw', 'fair'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'raw' ? t.viewRaw : t.viewFair}
                </button>
              ))}
            </div>
          </div>
          <p className="big-line" aria-live="polite">
            {t.changes(diff.gained.length, diff.raw.length)}
          </p>

          <div className="table-wrap">
            <table className="squad-table">
              <thead>
                <tr>
                  <th scope="col">{t.colRank}</th>
                  <th scope="col">{t.colName}</th>
                  <th scope="col">{t.colAge}</th>
                  <th scope="col">{t.colRaw}</th>
                  <th scope="col">{t.colFair}</th>
                  <th scope="col">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((p) => {
                  const selected = selectedIds.has(p.id)
                  const gained = gainedIds.has(p.id)
                  const lost = lostIds.has(p.id)
                  return (
                    <tr key={p.id} className={`${selected ? 'is-selected' : ''} ${gained ? 'is-gained' : ''} ${lost ? 'is-lost' : ''}`}>
                      <td>{view === 'raw' ? p.rawRank : p.fairRank}</td>
                      <th scope="row">
                        {p.name} <QuarterBadge q={p.quarter} t={t} />
                      </th>
                      <td>{ageText(p)}</td>
                      <td>{p.score}</td>
                      <td>{p.fairScore.toFixed(1)}</td>
                      <td>
                        <span className="status">{selected ? `✓ ${t.selected}` : t.notSelected}</span>
                        {gained && <span className="pill pill--late">▲ {t.badgeIn}</span>}
                        {lost && <span className="pill pill--early">▼ {t.badgeOut}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="help">{t.fairExplain}</p>
          <button type="button" className="button button--ghost" onClick={onDownload}>
            {t.downloadResults}
          </button>
        </section>
      )}
    </>
  )
}
