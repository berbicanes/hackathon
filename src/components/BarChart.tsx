export interface Bar {
  label: string
  /** Share 0–1 (drawn as bar height). */
  value: number
  /** Optional text shown above the bar instead of the percentage. */
  display?: string
  tone: 'early' | 'late' | 'neutral'
  /** Text marker so colour is never the only signal. */
  marker?: string
}

interface Props {
  title: string
  bars: Bar[]
  /** Share 0–1 for the dashed reference line; one value or one per bar. */
  expected?: number | number[]
  expectedLabel?: string
  maxValue?: number
  compact?: boolean
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

/** Accessible bar chart: plain HTML bars plus a visually hidden data table. */
export function BarChart({ title, bars, expected, expectedLabel, maxValue, compact }: Props) {
  const expectedAt = (i: number) => (Array.isArray(expected) ? expected[i] : expected)
  const max =
    maxValue ?? Math.max(...bars.map((b) => b.value), ...bars.map((_, i) => expectedAt(i) ?? 0)) * 1.15
  const scale = (v: number) => `${Math.min(100, (v / (max || 1)) * 100)}%`
  const single = typeof expected === 'number'

  return (
    <figure className={`chart${compact ? ' chart--compact' : ''}`}>
      <figcaption className="chart__title">{title}</figcaption>
      <div className="chart__plot" aria-hidden="true">
        {single && (
          <div className="chart__expected" style={{ bottom: scale(expected) }} />
        )}
        {bars.map((b, i) => {
          const exp = expectedAt(i)
          return (
            <div className="chart__col" key={b.label}>
              <div className={`chart__bar chart__bar--${b.tone}`} style={{ height: scale(b.value) }} />
              <span className="chart__value" style={{ bottom: scale(b.value) }}>
                {b.display ?? pct(b.value)}
              </span>
              {!single && exp !== undefined && <div className="chart__tick" style={{ bottom: scale(exp) }} />}
            </div>
          )
        })}
      </div>
      <div className="chart__labels" aria-hidden="true">
        {bars.map((b) => (
          <span key={b.label}>
            {b.label}
            {b.marker && <small>{b.marker}</small>}
          </span>
        ))}
      </div>
      {expectedLabel && (
        <p className="chart__legend" aria-hidden="true">
          <span className="chart__legend-line" /> {expectedLabel}
        </p>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((b, i) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              <td>{b.display ?? pct(b.value)}</td>
              {expectedAt(i) !== undefined && <td>{`${expectedLabel ?? ''} ${pct(expectedAt(i) ?? 0)}`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
