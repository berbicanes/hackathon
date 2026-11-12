import { useEffect, useState } from 'react'
import type { Strings } from '../i18n'
import { formatP } from '../lib/format'
import { BarChart, type Bar } from './BarChart'

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
}

export interface RaeData {
  all_players: Distribution
  under_21: Distribution
  underdog: UnderdogRow[]
}

type Group = 'under_21' | 'all_players'



function isRaeData(x: unknown): x is RaeData {
  const d = x as RaeData
  return Boolean(d?.all_players?.quarter_share && d?.under_21?.quarter_share && Array.isArray(d?.underdog))
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
  const monthBars: Bar[] = dist.month_share.map((v, i) => ({
    label: t.months[i],
    value: v,
    tone: i < 3 ? 'early' : i > 8 ? 'late' : 'neutral',
  }))

  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="bias-headline">
        <p className="kicker">{t.biasKicker(t.num(data.all_players.n))}</p>
        <h2 id="bias-headline" className="hero__stat">
          <span className="hero__number">{t.pct(u21.quarter_share[0])}</span>
          <span className="hero__text">{t.biasHeadline}</span>
        </h2>
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
        <dl className="stats">
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
        <BarChart
          title={t.monthTitle}
          bars={monthBars}
          expected={dist.expected_month_share}
          expectedLabel={t.expectedMonth}
          formatShare={(v) => t.pct(v, 1)}
          compact
        />
      </section>

      <section className="card" aria-labelledby="underdog-title">
        <h2 id="underdog-title">{t.underdogTitle}</h2>
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
                    <span className={`pill ${r.significant_at_05 ? 'pill--late' : ''}`}>
                      {r.significant_at_05 ? t.underdogVerdictYes : t.underdogVerdictNo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">{t.underdogSummary}</p>
      </section>

      <section className="card cta">
        <p>{t.ctaSquadText}</p>
        <button type="button" className="button button--primary" onClick={onGoToSquad}>
          {t.ctaSquad} →
        </button>
      </section>

      <section className="card two-col">
        <div>
          <h2>{t.methodTitle}</h2>
          <ul>
            {t.method.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>{t.limitsTitle}</h2>
          <ul>
            {t.limits.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
