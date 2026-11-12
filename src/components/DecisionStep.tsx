import { useState } from 'react'
import type { Strings } from '../i18n'
import { csvCell } from '../lib/csv'
import { ageAdvantage, compareSelections, quarterLabels, recommendGroup, type AnalysedPlayer } from '../lib/squad'
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
  const qLabels = quarterLabels(t.months, analysis.cutoffMonth)
  const n = players.length
  const diff = compareSelections(players, topN)
  const gainedIds = new Set(diff.gained.map((p) => p.id))
  const lostIds = new Set(diff.lost.map((p) => p.id))
  const group = recommendGroup(players, topN)
  // One list for every view: recommendation, talent cards, chart labels, player cards and the printed report.
  const talents = group.secondLook
  const secondLookIds = new Set(group.secondLook.map((p) => p.id))
  const selectedIds = new Set((view === 'fair' ? diff.fair : diff.raw).map((p) => p.id))
  const ordered = [...players].sort((a, b) => (view === 'fair' ? a.fairRank - b.fairRank : a.rawRank - b.rawRank))
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
          {nameButton(p)} <QuarterBadge q={p.quarter} labels={qLabels} />
        </li>
      ))}
    </ul>
  )
  const scoreDigits = players.some((p) => Math.round(p.score * 10) !== p.score * 10) ? 2 : 1
  const advantage = ageAdvantage(fit, analysis.higherIsBetter)
  // Sprint times and similar small-number tests need a second decimal.
  const digits = Math.abs(advantage.perMonth) < 1 ? 2 : 1
  const trendText =
    advantage.low !== null && advantage.high !== null
      ? t.trendCi(t.num(advantage.perMonth, digits), t.num(advantage.low, digits), t.num(advantage.high, digits), advantage.low >= 0)
      : ''
  const changePlaces = (delta: number) => setTopN(Math.max(1, Math.min(n, topN + delta)))

  return (
    <div className="stack">
      <StepHeading t={t} step={3} title={t.stepNames.decision} lead={t.decisionLead} />
      {synthetic && (
        <p className="synthetic" role="note">
          {t.syntheticBanner}
        </p>
      )}
      {n < 4 && <p className="alert alert--soft">{t.tooFew}</p>}

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
          </section>

          <section className="card recommend" aria-labelledby="recommend-title">
            <p className="kicker">{t.recommendKicker}</p>
            <h3 id="recommend-title" className="outcome__title" aria-live="polite">
              {group.secondLook.length > 0 ? t.expandHeadline(group.secondLook.length) : t.expandNone}
            </h3>
            <div className="recommend__grid">
              <div className="outcome__col recommend__keep">
                <p className="outcome__label">✓ {t.keepTitle(group.keep.length)}</p>
                <p className="outcome__reason">{t.keepText}</p>
              </div>
              {group.secondLook.length > 0 && (
                <div className="outcome__col outcome__col--in">
                  <p className="outcome__label">＋ {t.secondLookTitle}</p>
                  {chips(group.secondLook)}
                  {youngerRange && <p className="outcome__reason">{t.reasonYounger(youngerRange.text, youngerRange.max)}</p>}
                </div>
              )}
            </div>
            {fit.reliable ? (
              <p className="trend-line">
                {trendText} {!analysis.higherIsBetter && <span className="help">{t.lowerNote}</span>}
              </p>
            ) : (
              <p className="alert alert--soft" role="note">
                <strong>{t.unreliable}</strong> {fit.slopeLow !== null && trendText}
              </p>
            )}
          </section>
        </>
      )}

      <section className="card" aria-labelledby="scatter-heading">
        <h3 id="scatter-heading">{t.scatterHeading}</h3>
        <ScatterPlot t={t} players={players} fit={fit} highlighted={talents} quarterLabels={qLabels} higherIsBetter={analysis.higherIsBetter} />
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
                    <QuarterBadge q={p.quarter} labels={qLabels} />
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
          <div className="field field--view">
            <span className="field__label" id="view-label">
              {t.viewLabel}
            </span>
            <div className="segmented segmented--row segmented--three" role="group" aria-labelledby="view-label">
              {(['expanded', 'raw', 'fair'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'expanded' ? t.viewExpanded : v === 'raw' ? t.viewRaw : t.viewFair}
                </button>
              ))}
            </div>
          </div>
          {view !== 'expanded' && (
            <div className="compare" aria-live="polite">
              <p className="big-line">{t.changes(diff.gained.length, diff.raw.length)}</p>
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
              <p className="help">{t.compareNote}</p>
            </div>
          )}
          <p className="help">{view === 'fair' ? t.rankingFair : t.rankingRaw}</p>
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
                  const compare = view !== 'expanded'
                  const gained = compare && gainedIds.has(p.id)
                  const lost = compare && lostIds.has(p.id)
                  const second = !compare && secondLookIds.has(p.id)
                  return (
                    <tr key={p.id} className={`${selected ? 'is-selected' : ''} ${gained ? 'is-gained' : ''} ${lost ? 'is-lost' : ''} ${second ? 'is-second' : ''}`}>
                      <td className="squad-table__rank" data-label={t.colRank}>
                        {view === 'fair' ? p.fairRank : p.rawRank}
                      </td>
                      <th scope="row">
                        {nameButton(p)} <QuarterBadge q={p.quarter} labels={qLabels} />
                      </th>
                      <td data-label={t.colAge}>{ageText(p)}</td>
                      <td data-label={t.colRaw}>{t.num(p.score, Number.isInteger(p.score) ? 0 : scoreDigits)}</td>
                      <td data-label={t.colFair}>{t.num(p.fairScore, scoreDigits)}</td>
                      <td data-label={t.colStatus}>
                        <span className="status-cell">
                          {!second && <span className="status">{selected ? `✓ ${t.selected}` : t.notSelected}</span>}
                          {second && <span className="pill pill--late">＋ {t.secondLookBadge}</span>}
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
        secondLook={talents}
        slope={fit.slope}
        synthetic={synthetic}
        quarterLabels={qLabels}
      />

      <PlayerCard t={t} quarterLabels={qLabels} player={cardPlayer} meanAgeMonths={meanAgeMonths} squadSize={n} secondLook={cardPlayer ? secondLookIds.has(cardPlayer.id) : false} onClose={() => setCardId(null)} />
    </div>
  )
}
