import { useState } from 'react'
import type { Strings } from '../i18n'
import { csvCell } from '../lib/csv'
import { compareSelections, hiddenTalents, type AnalysedPlayer } from '../lib/squad'
import { isoDay, type SquadState } from '../useSquad'
import { MondayPanel } from './MondayPanel'
import { PlayerCard } from './PlayerCard'
import { PrintReport } from './PrintReport'
import { QuarterBadge } from './QuarterBadge'
import { ScatterPlot } from './ScatterPlot'
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


  const monthsYounger = (p: AnalysedPlayer) => Math.round(meanAgeMonths - p.ageMonths)
  /** "6–7" when every child in the list is younger (sign 1) or older (sign -1) than average; otherwise null. */
  const ageRange = (list: AnalysedPlayer[], sign: 1 | -1) => {
    const gaps = list.map((p) => monthsYounger(p) * sign)
    if (!gaps.length || gaps.some((g) => g <= 0)) return null
    const [min, max] = [Math.min(...gaps), Math.max(...gaps)]
    return { text: min === max ? `${min}` : `${min}–${max}`, max }
  }
  const youngerRange = ageRange(diff.gained, 1)
  const olderRange = ageRange(diff.lost, -1)
  const chips = (list: AnalysedPlayer[]) => (
    <ul className="chips">
      {list.map((p) => (
        <li key={p.id}>
          {nameButton(p)} <QuarterBadge q={p.quarter} t={t} />
        </li>
      ))}
    </ul>
  )
  const changePlaces = (delta: number) => setTopN(Math.max(1, Math.min(n, topN + delta)))

  return (
    <div className="stack">
      <StepHeading t={t} step={3} title={t.stepNames.decision} lead={t.decisionLead} />
      {synthetic && (
        <p className="synthetic" role="note">
          {t.syntheticBanner}
        </p>
      )}
      {n < 10 && <p className="alert alert--soft">{n < 4 ? t.tooFew : t.smallSquad}</p>}

      {n >= 4 && (
        <>
          <section className="card decision-controls" aria-label={t.selectionTitle}>
            <div className="field field--places">
              <label htmlFor="top-n">{t.topN}</label>
              <div className="places">
                <button type="button" className="places__btn" onClick={() => changePlaces(-1)} disabled={topN <= 1} aria-label={t.placesLess}>
                  −
                </button>
                <input
                  id="top-n"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={n}
                  value={topN}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isFinite(v)) setTopN(Math.max(1, Math.min(n, Math.round(v))))
                  }}
                />
                <button type="button" className="places__btn" onClick={() => changePlaces(1)} disabled={topN >= n} aria-label={t.placesMore}>
                  +
                </button>
              </div>
            </div>
            <div className="field field--view">
              <span className="field__label" id="view-label">
                {t.viewLabel}
              </span>
              <div className="segmented segmented--row" role="group" aria-labelledby="view-label">
                {(['raw', 'fair'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                    {v === 'raw' ? t.viewRaw : t.viewFair}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card outcome" aria-labelledby="outcome-title">
            <h3 id="outcome-title" className="outcome__title" aria-live="polite">
              {t.changes(diff.gained.length, diff.raw.length)}
            </h3>
            {diff.gained.length > 0 && (
              <div className="outcome__grid">
                <div className="outcome__col outcome__col--in">
                  <p className="outcome__label">▲ {t.inTitle}</p>
                  {chips(diff.gained)}
                  {youngerRange && <p className="outcome__reason">{t.reasonYounger(youngerRange.text, youngerRange.max)}</p>}
                </div>
                <div className="outcome__arrow" aria-hidden="true">
                  ⇄
                </div>
                <div className="outcome__col outcome__col--out">
                  <p className="outcome__label">▼ {t.outTitle}</p>
                  {chips(diff.lost)}
                  {olderRange && <p className="outcome__reason">{t.reasonOlder(olderRange.text, olderRange.max)}</p>}
                </div>
              </div>
            )}
            <p className="help">{fit.slope > 0.05 ? t.trend(t.num(fit.slope, 1)) : t.trendNone}</p>
          </section>
        </>
      )}

      <section className="card" aria-labelledby="scatter-heading">
        <h3 id="scatter-heading">{t.scatterHeading}</h3>
        <ScatterPlot t={t} players={players} fit={fit} highlighted={talents} quarterLabels={t.quarterLabels} />
      </section>

      <section className="card" aria-labelledby="talent-title">
        <h3 id="talent-title">{t.talentTitle}</h3>
        {talents.length === 0 ? (
          <p className="help">{t.talentNone}</p>
        ) : (
          <>
            <p className="help">{t.talentIntro}</p>
            <ul className="talent-cards">
              {talents.map((p) => (
                <li key={p.id}>
                  <button type="button" className="talent-card" onClick={() => setCardId(p.id)} aria-label={t.openCard(p.name)}>
                    <span className="talent-card__name">{p.name}</span>
                    <QuarterBadge q={p.quarter} t={t} />
                    <span className="talent-card__rank">{t.talentRank(p.rawRank, p.fairRank)}</span>
                    <span className="talent-card__age">{relAge(p)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {n >= 4 && (
        <section className="card" aria-labelledby="ranking-title">
          <h3 id="ranking-title">{t.rankingTitle}</h3>
          <p className="help">{view === 'raw' ? t.rankingRaw : t.rankingFair}</p>
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
                      <td className="squad-table__rank" data-label={t.colRank}>
                        {view === 'raw' ? p.rawRank : p.fairRank}
                      </td>
                      <th scope="row">
                        {nameButton(p)} <QuarterBadge q={p.quarter} t={t} />
                      </th>
                      <td data-label={t.colAge}>{ageText(p)}</td>
                      <td data-label={t.colRaw}>{t.num(p.score, Number.isInteger(p.score) ? 0 : 1)}</td>
                      <td data-label={t.colFair}>{t.num(p.fairScore, 1)}</td>
                      <td data-label={t.colStatus}>
                        <span className="status-cell">
                          <span className="status">{selected ? `✓ ${t.selected}` : t.notSelected}</span>
                          {gained && <span className="pill pill--late">▲ {t.badgeIn}</span>}
                          {lost && <span className="pill pill--early">▼ {t.badgeOut}</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <MondayPanel t={t} />

      <section className="card finish" aria-label={t.printButton}>
        <p className="big-line">{t.finishLine}</p>
        <div className="actions">
          <button type="button" className="button button--primary button--next" onClick={() => window.print()}>
            {t.printButton}
          </button>
          <button type="button" className="button" onClick={onDownloadResults}>
            {t.downloadResults}
          </button>
        </div>
      </section>

      <details className="card how">
        <summary>{t.howTitle}</summary>
        <p>{t.fairExplain}</p>
      </details>

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

      <PlayerCard t={t} player={cardPlayer} meanAgeMonths={meanAgeMonths} squadSize={n} onClose={() => setCardId(null)} />
    </div>
  )
}
