import type { Strings } from '../i18n'
import type { AnalysedPlayer, SelectionDiff } from '../lib/squad'

interface Props {
  t: Strings
  reference: Date
  players: AnalysedPlayer[]
  quarterCounts: [number, number, number, number]
  diff: SelectionDiff
  talents: AnalysedPlayer[]
  slope: number
  synthetic: boolean
}

/** One-page printable summary; hidden on screen, the only thing shown when printing. */
export function PrintReport({ t, reference, players, quarterCounts, diff, talents, slope, synthetic }: Props) {
  const n = players.length
  const names = (list: AnalysedPlayer[]) =>
    list.length ? list.map((p) => `${p.name} (${t.quarterLabels[p.quarter - 1]})`).join(', ') : t.reportNone

  return (
    <section className="print-report" aria-hidden="true">
      <h1>{t.reportTitle}</h1>
      <p>{t.reportMeta(t.formatDate(reference), n)}</p>
      {synthetic && <p className="print-report__warn">{t.reportSynthetic}</p>}

      <h2>{t.reportSkew}</h2>
      <table>
        <tbody>
          <tr>
            {quarterCounts.map((c, i) => (
              <td key={t.quarterLabels[i]}>
                <strong>{t.quarterLabels[i]}</strong>: {c} ({t.pct(n ? c / n : 0)})
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p>{slope > 0.05 ? t.trend(t.num(slope, 1)) : t.trendNone}</p>

      <h2>{t.reportSelection(diff.raw.length)}</h2>
      <p>
        <strong>{t.keepTitle(diff.raw.length)}.</strong> {t.keepText}
      </p>
      <p>
        <strong>{t.secondLookTitle}:</strong> {names(diff.gained)}
      </p>
      <p>
        <strong>{t.reportTalents}:</strong> {names(talents)}
      </p>

      <h2>{t.mondayTitle}</h2>
      <ol>
        {t.monday.map((m) => (
          <li key={m.title}>
            <strong>{m.title}.</strong> {m.text}
          </li>
        ))}
      </ol>
      <p className="print-report__foot">{t.reportFooter}</p>
    </section>
  )
}
