import type { Strings } from '../i18n'
import { formatP } from '../lib/format'
import { useYouthData } from '../useYouthData'

const TONES = ['early', 'neutral', 'neutral', 'late'] as const

/**
 * Real youth evidence: birth quarters of the 2025 U-17 World Cup squads, boys and girls.
 * Aggregate shares only; the data file holds no names and no individual birth dates.
 */
export function YouthCard({ t }: { t: Strings }) {
  const data = useYouthData()
  if (!data) return null

  const rows = [
    { key: 'boys', label: t.youthBoys, group: data.boys },
    { key: 'girls', label: t.youthGirls, group: data.girls },
  ]

  return (
    <section className="card youth" aria-labelledby="youth-title">
      <h3 id="youth-title">{t.youthTitle}</h3>
      <p>{t.youthSentence(t.num(data.boys.q1_q4_ratio, 1), t.num(data.girls.q1_q4_ratio, 1), data.girls.significant_at_05)}</p>
      {rows.map(({ key, label, group }) => (
        <div className="youth__row" key={key}>
          <div className="youth__head">
            <strong>{label}</strong>
            <span className="youth__stats">
              {t.youthStats(t.num(group.n), t.num(group.q1_q4_ratio, 1), formatP(group.p_value, t.decimal))}
              {!group.significant_at_05 && <span className="pill"> {t.cutoffNotSig}</span>}
            </span>
          </div>
          <div className="youth__bar" role="img" aria-label={t.youthBarLabel(label, group.quarter_share.map((s) => t.pct(s)))}>
            {group.quarter_share.map((share, i) => (
              <span key={t.quarterLabels[i]} className={`youth__seg youth__seg--${TONES[i]}`} style={{ width: `${share * 100}%` }}>
                <span className="youth__seg-label">{t.quarterLabels[i]}</span> {t.pct(share)}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="help">
        {t.youthSource}{' '}
        <a href={data.boys.source} rel="noopener noreferrer">
          {t.youthBoys}
        </a>
        {' · '}
        <a href={data.girls.source} rel="noopener noreferrer">
          {t.youthGirls}
        </a>
      </p>
    </section>
  )
}
