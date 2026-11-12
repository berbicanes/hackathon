import { useEffect, useRef, useState } from 'react'
import type { Strings } from '../i18n'
import type { AnalysedPlayer, LinearFit } from '../lib/squad'

interface Props {
  t: Strings
  players: AnalysedPlayer[]
  fit: LinearFit
  /** Children whose names are written next to their dot. */
  highlighted: AnalysedPlayer[]
  /** Label for each birth quarter 1–4, in selection-year order. */
  quarterLabels: string[]
  /** When false, smaller scores are drawn higher so that "above the line" always means better. */
  higherIsBetter?: boolean
}

const TONES = ['early', 'neutral', 'neutral', 'late'] as const

/** One marker shape per birth quarter, so colour is never the only signal. */
function Marker({ q, x, y, r }: { q: number; x: number; y: number; r: number }) {
  const cls = `scatter__dot scatter__dot--${TONES[q - 1]}`
  if (q === 1) return <circle className={cls} cx={x} cy={y} r={r} />
  if (q === 2) return <rect className={cls} x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} />
  if (q === 3) return <polygon className={cls} points={`${x},${y - r * 1.2} ${x + r * 1.2},${y} ${x},${y + r * 1.2} ${x - r * 1.2},${y}`} />
  return <polygon className={cls} points={`${x},${y - r * 1.2} ${x + r * 1.15},${y + r} ${x - r * 1.15},${y + r}`} />
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min || 1
  const raw = span / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  return ticks
}

/**
 * "How it works": every child as a dot (age on the test date against score) and the
 * squad's age trend as a line. A child above the line scores better than is typical for
 * their age. Screen readers get the same message as text.
 */
export function ScatterPlot({ t, players, fit, highlighted, quarterLabels, higherIsBetter = true }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const update = () => setWidth(Math.max(280, Math.round(el.clientWidth)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (players.length < 2) return null

  const height = Math.round(Math.min(420, Math.max(300, width * 0.55)))
  const pad = { left: 44, right: 16, top: 28, bottom: 44 }
  const ages = players.map((p) => p.ageMonths)
  const scores = players.map((p) => p.score)
  const [minAge, maxAge] = [Math.min(...ages) - 0.5, Math.max(...ages) + 0.5]
  const lineAt = (age: number) => fit.intercept + fit.slope * age
  const allY = [...scores, lineAt(minAge), lineAt(maxAge)]
  const spread = Math.max(...allY) - Math.min(...allY) || 1
  const [minScore, maxScore] = [Math.min(...allY) - spread * 0.08, Math.max(...allY) + spread * 0.12]

  const x = (age: number) => pad.left + ((age - minAge) / (maxAge - minAge)) * (width - pad.left - pad.right)
  const y = (score: number) => {
    const share = (score - minScore) / (maxScore - minScore)
    const up = higherIsBetter ? share : 1 - share
    return height - pad.bottom - up * (height - pad.top - pad.bottom)
  }
  const r = width < 480 ? 5 : 6.5
  const highlightedIds = new Set(highlighted.map((p) => p.id))
  const isAbove = (p: AnalysedPlayer) => p.residual > 0
  const above = players.filter(isAbove).length
  const yearTicks = niceTicks(minAge, maxAge, width < 480 ? 3 : 6)
  const scoreTicks = niceTicks(minScore, maxScore, 4)
  const quartersPresent = [1, 2, 3, 4].filter((q) => players.some((p) => p.quarter === q))
  // The trend label sits at the right end of the line, on the side with more room.
  const labelY = y(lineAt(maxAge))
  const labelBelow = labelY < pad.top + 24
  const wide = width >= 480
  // Name labels are spread out vertically so that neighbouring children stay readable.
  const nameLabels = [...highlighted]
    .sort((a, b) => y(a.score) - y(b.score))
    .reduce<{ p: AnalysedPlayer; labelY: number }[]>((placed, p) => {
      const wanted = y(p.score) - r - 2
      const previous = placed[placed.length - 1]
      placed.push({ p, labelY: previous ? Math.max(wanted, previous.labelY + 15) : wanted })
      return placed
    }, [])

  return (
    <figure className="scatter">
      <div ref={wrap} className="scatter__wrap">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="scatter-title" aria-describedby="scatter-desc">
          <title id="scatter-title">{t.scatterTitle}</title>
          <desc id="scatter-desc">
            {t.scatterSummary(players.length, above, highlighted.map((p) => p.name).join(', '))}
          </desc>
          {scoreTicks.map((v) => (
            <g key={`y${v}`}>
              <line className="scatter__grid" x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} />
              <text className="scatter__tick" x={pad.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">
                {t.num(v, Number.isInteger(v) ? 0 : 1)}
              </text>
            </g>
          ))}
          {yearTicks.map((v) => (
            <text key={`x${v}`} className="scatter__tick" x={x(v)} y={height - pad.bottom + 18} textAnchor="middle">
              {t.num(v, 0)}
            </text>
          ))}
          <line className="scatter__axis" x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} />
          <text className="scatter__label" x={(pad.left + width - pad.right) / 2} y={height - 6} textAnchor="middle">
            {t.scatterX}
          </text>
          <text className="scatter__label" x={pad.left - 36} y={pad.top - 12}>
            {higherIsBetter ? t.scatterY : t.scatterYLower}
          </text>

          <line className="scatter__line" x1={x(minAge)} y1={y(lineAt(minAge))} x2={x(maxAge)} y2={y(lineAt(maxAge))} />
          {wide && (
            <text className="scatter__line-label" x={x(maxAge) - 4} y={labelY + (labelBelow ? 18 : -10)} textAnchor="end">
              {t.scatterLine}
            </text>
          )}

          {players.map((p) => (
            <Marker key={p.id} q={p.quarter} x={x(p.ageMonths)} y={y(p.score)} r={highlightedIds.has(p.id) ? r + 1.5 : r} />
          ))}
          {nameLabels.map(({ p, labelY: ly }) => {
            const px = x(p.ageMonths)
            const nearRight = px > width - 90
            return (
              <text key={p.id} className="scatter__name" x={px + (nearRight ? -r - 6 : r + 6)} y={ly} textAnchor={nearRight ? 'end' : 'start'}>
                {p.name}
              </text>
            )
          })}
        </svg>
      </div>
      <ul className="scatter__legend" aria-hidden="true">
        <li>
          <svg width="26" height="18" viewBox="0 0 26 18">
            <line className="scatter__line" x1="1" x2="25" y1="9" y2="9" />
          </svg>
          {t.scatterLine}
        </li>
        {quartersPresent.map((q) => (
          <li key={q}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <Marker q={q} x={9} y={9} r={6} />
            </svg>
            {quarterLabels[q - 1]}
            {q === 1 ? ` · ${t.earlyBorn}` : q === 4 ? ` · ${t.lateBorn}` : ''}
          </li>
        ))}
      </ul>
      <figcaption className="scatter__caption">{t.scatterCaption}</figcaption>
    </figure>
  )
}
