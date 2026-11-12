/** Birth-quarter badge in plain words ("Jan–Mar ▲"); the arrow means colour is never the only signal. */
export function QuarterBadge({ q, labels }: { q: number; labels: string[] }) {
  const tone = q === 1 ? 'early' : q === 4 ? 'late' : 'neutral'
  return (
    <span className={`pill pill--${tone}`}>
      {labels[q - 1]}
      {q === 1 ? ' ▲' : q === 4 ? ' ▼' : ''}
    </span>
  )
}
