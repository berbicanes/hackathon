import { useEffect, useRef, useState } from 'react'
import type { Strings } from '../i18n'
import { LABEL_HEIGHT, placeLabels } from '../lib/labels'
import type { AnalysedPlayer, LinearFit } from '../lib/squad'
import { scoreOutlierFlags } from '../lib/warnings'

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

  const height = Math.round(Math.min(420, Math.max(270, width * 0.55)))
  const ages = players.map((p) => p.ageMonths)
  const [minAge, maxAge] = [Math.min(...ages) - 0.5, Math.max(...ages) + 0.5]
  const lineAt = (age: number) => fit.intercept + fit.slope * age

  // Scores the app already flags as outliers do not set the scale: the axis covers the
  // rest of the squad, and each outlier is drawn as an arrow at the edge with its value.
  const flags = scoreOutlierFlags(players.map((p) => p.score))
  const inRange = players.filter((_, i) => !flags[i])
  const outliers = players.filter((_, i) => flags[i])
  const scaleScores = (inRange.length >= 2 ? inRange : players).map((p) => p.score)
  const [lowScore, highScore] = [Math.min(...scaleScores), Math.max(...scaleScores)]
  const clamp = (v: number) => (outliers.length ? Math.min(highScore, Math.max(lowScore, v)) : v)
  const allY = [...scaleScores, clamp(lineAt(minAge)), clamp(lineAt(maxAge))]
  const spread = Math.max(...allY) - Math.min(...allY) || 1
  const [minScore, maxScore] = [Math.min(...allY) - spread * 0.08, Math.max(...allY) + spread * 0.12]
  const scoreTicks = niceTicks(minScore, maxScore, 4)
  const tickText = (v: number) => t.num(v, Number.isInteger(v) ? 0 : Math.abs(v) < 10 ? 2 : 1)
  // Room for the widest tick label, so large numbers are never cut off on the left.
  const widestTick = Math.max(...scoreTicks.map((v) => tickText(v).length), 2)
  const pad = { left: Math.max(40, Math.round(widestTick * 7.4 + 16)), right: 16, top: 30, bottom: 44 }

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
  const quartersPresent = [1, 2, 3, 4].filter((q) => players.some((p) => p.quarter === q))
  // The trend label sits at the right end of the line, on the side with more room.
  const labelY = y(lineAt(maxAge))
  const labelBelow = labelY < pad.top + 24
  const wide = width >= 480
  const tight = width < 480 || highlighted.length > 4
  /** First name when space is tight; initials if even that is long. */
  const shortName = (name: string) => {
    if (!tight || name.length <= 10) return name
    const first = name.split(/\s+/)[0]
    return first.length <= 10 ? first : name.split(/[\s-]+/).map((part) => `${part[0]}.`).join('')
  }
  const outlierIds = new Set(outliers.map((p) => p.id))
  const lineSamples = Array.from({ length: 41 }, (_, i) => {
    const age = minAge + ((maxAge - minAge) * i) / 40
    return { x: x(age), y: y(lineAt(age)) }
  })
  const nameLabels = placeLabels(
    highlighted
      .filter((p) => !outlierIds.has(p.id))
      // On a phone only the first few are named; the full list is in the recommendation above.
      .slice(0, width < 480 ? 4 : highlighted.length)
      .map((p) => ({ id: p.id, name: shortName(p.name), x: x(p.ageMonths), y: y(p.score) })),
    inRange.map((p) => ({ x: x(p.ageMonths), y: y(p.score) })),
    { left: pad.left + 2, right: width - pad.right, top: 2, bottom: height - pad.bottom - 2 },
    r,
    lineSamples,
  )

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
                {tickText(v)}
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
          <text className="scatter__label" x={4} y={pad.top - 14}>
            {higherIsBetter ? t.scatterY : t.scatterYLower}
          </text>

          <clipPath id="scatter-plot-area">
            <rect x={pad.left} y={pad.top - 6} width={width - pad.left - pad.right} height={height - pad.top - pad.bottom + 6} />
          </clipPath>
          <line className="scatter__line" clipPath="url(#scatter-plot-area)" x1={x(minAge)} y1={y(lineAt(minAge))} x2={x(maxAge)} y2={y(lineAt(maxAge))} />
          {wide && (
            <text className="scatter__line-label" x={x(maxAge) - 4} y={labelY + (labelBelow ? 18 : -10)} textAnchor="end">
              {t.scatterLine}
            </text>
          )}

          {inRange.map((p) => (
            <Marker key={p.id} q={p.quarter} x={x(p.ageMonths)} y={y(p.score)} r={highlightedIds.has(p.id) ? r + 1.5 : r} />
          ))}
          {([true, false] as const).map((atTop) => {
            // One label per edge: several outliers on the same side share it instead of overlapping.
            const drawnAtTop = (p: AnalysedPlayer) => (p.score > highScore ? higherIsBetter : !higherIsBetter)
            const group = outliers.filter((p) => drawnAtTop(p) === atTop).sort((p, q) => q.score - p.score)
            if (!group.length) return null
            const meanX = group.reduce((sum, p) => sum + x(p.ageMonths), 0) / group.length
            const half = group.length * 34 + 10
            const px = Math.min(width - pad.right - half, Math.max(pad.left + half, meanX))
            return (
              <text key={String(atTop)} className="scatter__outlier" x={px} y={atTop ? pad.top - 10 : height - pad.bottom - 6} textAnchor="middle">
                {atTop ? '↑' : '↓'} {group.map((p) => t.num(p.score, Number.isInteger(p.score) ? 0 : 1)).join(' · ')}
              </text>
            )
          })}
          {nameLabels.map((l) => (
            <g key={l.id}>
              {l.leader && <line className="scatter__leader" x1={l.dotX} y1={l.dotY} x2={l.anchorX} y2={l.anchorY} />}
              <text className="scatter__name" x={l.box.x + 3} y={l.box.y + LABEL_HEIGHT - 4}>
                {l.name}
              </text>
            </g>
          ))}
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
