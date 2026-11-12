import type { Strings } from '../i18n'

/** Birth-quarter badge in plain words ("Jan–Mar ▲"); the arrow means colour is never the only signal. */
export function QuarterBadge({ q, t }: { q: number; t: Strings }) {
  const tone = q === 1 ? 'early' : q === 4 ? 'late' : 'neutral'
  return (
    <span className={`pill pill--${tone}`}>
      {t.quarterLabels[q - 1]}
      {q === 1 ? ' ▲' : q === 4 ? ' ▼' : ''}
    </span>
  )
}
