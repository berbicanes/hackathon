import { useEffect, useState } from 'react'
import type { CutoffRowId, Strings } from '../i18n'
import { formatP } from '../lib/format'
import { BarChart, type Bar } from './BarChart'
import { StepHeading } from './StepHeading'
import { YouthCard } from './YouthCard'

interface ChiSquare {
  chi2: number
  df: number
  p_value: number
}

interface Distribution {
  n: number
  quarters: number[]
  quarter_share: number[]
  expected_quarter_share: number[]
  month_share: number[]
  expected_month_share: number[]
  q1_q4_ratio: number
  chi_square_quarters: ChiSquare
}

interface UnderdogRow {
  band: string
  n_q1: number
  n_q4: number
  median_value_q1: number
  median_value_q4: number
  p_value: number
  prob_q4_greater: number
  significant_at_05: boolean
  significant_bonferroni: boolean
}

interface CutoffRow {
  id: CutoffRowId
  cutoff_month: number
  n: number
  first_quarter_share: number
  last_quarter_share: number
  ratio: number
  p_value: number
  significant_at_05: boolean
}

export interface RaeData {
  all_players: Distribution
  under_21: Distribution
  cutoff_robustness: { rows: CutoffRow[] }
  underdog: UnderdogRow[]
  underdog_tests: { n_tests: number; bonferroni_threshold: number }
}

type Group = 'under_21' | 'all_players'



function isRaeData(x: unknown): x is RaeData {
  const d = x as RaeData
  return Boolean(
    d?.all_players?.quarter_share &&
      d?.under_21?.quarter_share &&
      Array.isArray(d?.cutoff_robustness?.rows) &&
      Array.isArray(d?.underdog) &&
      typeof d?.underdog_tests?.bonferroni_threshold === 'number',
  )
}

export function BiasMirror({ t, onGoToSquad }: { t: Strings; onGoToSquad: () => void }) {
  const [data, setData] = useState<RaeData | null>(null)
  const [error, setError] = useState(false)
  const [group, setGroup] = useState<Group>('under_21')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/rae.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => (isRaeData(json) ? setData(json) : setError(true)))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setError(true)
      })
    return () => controller.abort()
  }, [])

  if (error) return <p role="alert" className="card">{t.loadError}</p>
  if (!data) return <p className="card" aria-busy="true">{t.loading}</p>

  const u21 = data.under_21
  const dist = data[group]
  const quarterBars: Bar[] = dist.quarter_share.map((v, i) => ({
    label: t.quarterLabels[i],
    value: v,
    tone: i === 0 ? 'early' : i === 3 ? 'late' : 'neutral',
    marker: i === 0 ? `▲ ${t.earlyBorn}` : i === 3 ? `▼ ${t.lateBorn}` : undefined,
  }))
  const cutoffRows = data.cutoff_robustness.rows.filter((r) => r.id in t.cutoffRows)
  const cutoff = (id: CutoffRowId) => cutoffRows.find((r) => r.id === id)
  const japan = cutoff('japan_u21')
  const [cBase, cExclEng, cExclAll, cEng, cEngAll] = [
    cutoff('u21_all'),
    cutoff('u21_excl_england'),
    cutoff('u21_excl_non_january'),
    cutoff('england_u21'),
    cutoff('england_all'),
  ]
  /** Three-month range label, e.g. cut-off month 9 → "Sep–Nov" (offset 0) or "Jun–Aug" (offset 9). */
  const monthRange = (cutoffMonth: number, offset: number) =>
    `${t.months[(cutoffMonth - 1 + offset) % 12]}–${t.months[(cutoffMonth + 1 + offset) % 12]}`
  const bonferroni = t.num(data.underdog_tests.bonferroni_threshold, 3)
  const monthBars: Bar[] = dist.month_share.map((v, i) => ({
    label: t.months[i],
    value: v,
    tone: i < 3 ? 'early' : i > 8 ? 'late' : 'neutral',
  }))

  return (
    <div className="stack">
      <StepHeading t={t} step={1} title={t.problemTitle} lead={t.problemLead} />
      <section className="card hero" aria-labelledby="bias-headline">
        <p className="kicker">{t.biasKicker(t.num(data.all_players.n))}</p>
        <h2 id="bias-headline" className="hero__stat">
          <span className="hero__number">{t.pct(u21.quarter_share[0])}</span>
          <span className="hero__text">{t.biasHeadline}</span>
        </h2>
        <p className="hero__plain">{t.biasPlain}</p>
        <p className="hero__sub">
          {t.biasSub(
            t.pct(u21.expected_quarter_share[0]),
            t.pct(u21.quarter_share[3]),
            t.num(u21.q1_q4_ratio, 1),
          )}
        </p>
      </section>

      <section className="card" aria-label={t.chartTitle}>
        <div className="segmented" role="group" aria-label={t.groupLabel}>
          {(['under_21', 'all_players'] as const).map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g === 'under_21' ? t.groupU21 : t.groupAll}
            </button>
          ))}
        </div>
        <BarChart
          title={`${t.chartTitle} — ${group === 'under_21' ? t.groupU21 : t.groupAll}`}
          bars={quarterBars}
          expected={0.25}
          expectedLabel={t.expectedLine}
          maxValue={0.4}
          formatShare={(v) => t.pct(v, 1)}
        />
        {japan && <p className="also">{t.japanLine(t.num(japan.ratio, 1))}</p>}
        <dl className="stats stats--muted">
          <div>
            <dt>{t.statSample}</dt>
            <dd>{t.num(dist.n)}</dd>
          </div>
          <div>
            <dt>{t.statChi}</dt>
            <dd>{t.num(dist.chi_square_quarters.chi2, 2)}</dd>
          </div>
          <div>
            <dt>{t.statP}</dt>
            <dd>{formatP(dist.chi_square_quarters.p_value, t.decimal)}</dd>
          </div>
          <div>
            <dt>{t.statRatio}</dt>
            <dd>{t.num(dist.q1_q4_ratio, 2)}×</dd>
          </div>
        </dl>
      </section>

      <YouthCard t={t} />

      <details className="card analysts">
        <summary>
          <span className="analysts__title">{t.analystsTitle}</span>
          <span className="analysts__hint">{t.analystsHint}</span>
        </summary>

      <section className="analysts__part" aria-label={t.monthTitle}>
        <BarChart
          title={t.monthTitle}
          bars={monthBars}
          expected={dist.expected_month_share}
          expectedLabel={t.expectedMonth}
          formatShare={(v) => t.pct(v, 1)}
          compact
        />
      </section>

      <section className="analysts__part" aria-labelledby="cutoff-title">
        <h3 id="cutoff-title">{t.cutoffTitle}</h3>
        <p>{t.cutoffIntro}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.cutoffColGroup}</th>
                <th scope="col">{t.cutoffColCutoff}</th>
                <th scope="col">{t.cutoffColN}</th>
                <th scope="col">{t.cutoffColFirst}</th>
                <th scope="col">{t.cutoffColLast}</th>
                <th scope="col">{t.cutoffColRatio}</th>
                <th scope="col">{t.underdogP}</th>
              </tr>
            </thead>
            <tbody>
              {cutoffRows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="row-label">{t.cutoffRows[r.id]}</th>
                  <td>{t.cutoffDate(r.cutoff_month)}</td>
                  <td>{t.num(r.n)}</td>
                  <td>
                    {t.pct(r.first_quarter_share, 1)} <small>{monthRange(r.cutoff_month, 0)}</small>
                  </td>
                  <td>
                    {t.pct(r.last_quarter_share, 1)} <small>{monthRange(r.cutoff_month, 9)}</small>
                  </td>
                  <td>{t.num(r.ratio, 2)}×</td>
                  <td>
                    {formatP(r.p_value, t.decimal)}{' '}
                    {!r.significant_at_05 && <span className="pill">{t.cutoffNotSig}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cBase && cExclEng && cExclAll && cEng && cEngAll && (
          <p className="note">
            {t.cutoffSummary({
              base: t.num(cBase.ratio, 2),
              exclEngland: t.num(cExclEng.ratio, 2),
              exclAll: t.num(cExclAll.ratio, 2),
              englandRatio: t.num(cEng.ratio, 2),
              englandN: t.num(cEng.n),
              englandP: formatP(cEng.p_value, t.decimal),
              englandSignificant: cEng.significant_at_05,
              englandAllRatio: t.num(cEngAll.ratio, 2),
            })}
          </p>
        )}
      </section>

      <section className="analysts__part" aria-labelledby="underdog-title">
        <h3 id="underdog-title">{t.underdogTitle}</h3>
        <p>{t.underdogIntro}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.underdogBand}</th>
                <th scope="col">{t.underdogMedianQ1}</th>
                <th scope="col">{t.underdogMedianQ4}</th>
                <th scope="col">{t.underdogProb}</th>
                <th scope="col">{t.underdogP}</th>
                <th scope="col">{t.underdogBonfCol(bonferroni)}</th>
              </tr>
            </thead>
            <tbody>
              {data.underdog.map((r) => (
                <tr key={r.band}>
                  <th scope="row">{r.band}</th>
                  <td>
                    €{t.num(r.median_value_q1 / 1000)}k <small>n={r.n_q1}</small>
                  </td>
                  <td>
                    €{t.num(r.median_value_q4 / 1000)}k <small>n={r.n_q4}</small>
                  </td>
                  <td>{t.pct(r.prob_q4_greater, 1)}</td>
                  <td>
                    {formatP(r.p_value, t.decimal)}{' '}
                    <span className={`pill ${r.significant_bonferroni ? 'pill--late' : ''}`}>
                      {r.significant_at_05 ? t.underdogVerdictYes : t.underdogVerdictNo}
                    </span>
                  </td>
                  <td>
                    {r.significant_bonferroni
                      ? `✓ ${t.underdogBonfYes}`
                      : r.significant_at_05
                        ? `✗ ${t.underdogBonfNo}`
                        : t.underdogBonfNull}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="help">{t.underdogBonfNote(data.underdog_tests.n_tests, bonferroni)}</p>
        <p className="note">{t.underdogSummary}</p>
      </section>
      <section className="analysts__part two-col">
        <div>
          <h3>{t.methodTitle}</h3>
          <ul>
            {t.method.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{t.limitsTitle}</h3>
          <ul>
            {t.limits.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </section>
      </details>

      <section className="card cta">
        <p>{t.ctaSquadText}</p>
        <button type="button" className="button button--primary button--next" onClick={onGoToSquad}>
          {t.ctaSquad} →
        </button>
      </section>

    </div>
  )
}
