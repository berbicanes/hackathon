import { useState } from 'react'
import type { Strings } from '../i18n'
import { csvCell } from '../lib/csv'
import { compareSelections, hiddenTalents, type AnalysedPlayer } from '../lib/squad'
import { isoDay, type SquadState } from '../useSquad'
import { MondayPanel } from './MondayPanel'
import { PlayerCard } from './PlayerCard'
import { PrintReport } from './PrintReport'
import { QuarterBadge } from './QuarterBadge'
import { StepHeading } from './StepHeading'

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}


interface Props {
  t: Strings
  squad: SquadState
  onBack: () => void
}

/** Step 3: who is selected on raw score, who once age is taken into account. */
export function DecisionStep({ t, squad, onBack }: Props) {
  const { analysis, reference, synthetic, topN, setTopN, view, setView } = squad
  const [cardId, setCardId] = useState<number | null>(null)

  if (!analysis) {
    return (
      <div className="stack">
        <StepHeading t={t} step={3} title={t.stepNames.decision} lead={t.decisionLead} />
        <section className="card empty">
          <p className="big-line">{t.decisionEmpty}</p>
          <div className="actions">
            <button type="button" className="button button--primary" onClick={onBack}>
              ← {t.decisionEmptyAction}
            </button>
          </div>
        </section>
      </div>
    )
  }

  const { players, quarterCounts, fit, meanAgeMonths } = analysis
  const n = players.length
  const diff = compareSelections(players, topN)
  const talents = hiddenTalents(players, 3)
  const gainedIds = new Set(diff.gained.map((p) => p.id))
  const lostIds = new Set(diff.lost.map((p) => p.id))
  const selectedIds = new Set((view === 'raw' ? diff.raw : diff.fair).map((p) => p.id))
  const ordered = [...players].sort((a, b) => (view === 'raw' ? a.rawRank - b.rawRank : a.fairRank - b.fairRank))
  const cardPlayer = players.find((p) => p.id === cardId) ?? null

  const nameButton = (p: AnalysedPlayer) => (
    <button type="button" className="link-button" onClick={() => setCardId(p.id)} aria-label={t.openCard(p.name)}>
      {p.name}
    </button>
  )

  const ageText = (p: AnalysedPlayer) => {
    const months = Math.floor(p.ageMonths)
    return t.ageYM(Math.floor(months / 12), months % 12)
  }
  const relAge = (p: AnalysedPlayer) => {
    const diffM = Math.round(meanAgeMonths - p.ageMonths)
    if (diffM === 0) return t.averageAge
    return diffM > 0 ? t.monthsYounger(diffM) : t.monthsOlder(-diffM)
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
      <StepHeading t={t} step={3} title={t.stepNames.decision} lead={t.decisionLead} />
      {synthetic && (
        <p className="synthetic" role="note">
          {t.syntheticBanner}
        </p>
      )}
      {n < 10 && <p className="alert alert--soft">{n < 4 ? t.tooFew : t.smallSquad}</p>}

      <div className="grid-2">
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
                    <strong>{nameButton(p)}</strong> <QuarterBadge q={p.quarter} t={t} />
                  </div>
                  <span className="talents__rank">{t.talentRank(p.rawRank, p.fairRank)}</span>
                  <span className="help">{relAge(p)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="help">{fit.slope > 0.05 ? t.trend(t.num(fit.slope, 1)) : t.trendNone}</p>
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
                        {nameButton(p)} <QuarterBadge q={p.quarter} t={t} />
                      </th>
                      <td>{ageText(p)}</td>
                      <td>{t.num(p.score, Number.isInteger(p.score) ? 0 : 1)}</td>
                      <td>{t.num(p.fairScore, 1)}</td>
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
          <div className="actions">
            <button type="button" className="button button--ghost" onClick={onDownloadResults}>
              {t.downloadResults}
            </button>
            <button type="button" className="button button--ghost" onClick={() => window.print()}>
              {t.printButton}
            </button>
          </div>
        </section>
      )}

      <PrintReport
        t={t}
        reference={reference}
        players={players}
        quarterCounts={quarterCounts}
        diff={diff}
        talents={talents}
        slope={fit.slope}
        synthetic={synthetic}
      />

      <PlayerCard
        t={t}
        player={cardPlayer}
        meanAgeMonths={meanAgeMonths}
        squadSize={n}
        onClose={() => setCardId(null)}
      />
          <MondayPanel t={t} />
    </div>
  )
}
