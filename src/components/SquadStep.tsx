import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import type { Strings } from '../i18n'
import { CSV_TEMPLATE, MAX_ROWS } from '../lib/csv'
import { CUTOFF_MONTHS, olderHalfLabel, quarterLabels } from '../lib/squad'
import type { LoadError, SquadState } from '../useSquad'
import { BarChart } from './BarChart'
import { DateField } from './DateField'
import { StepHeading } from './StepHeading'

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const errorText = (t: Strings, e: LoadError) =>
  e.kind === 'tooLarge'
    ? t.fileTooLarge
    : e.kind === 'unreadable'
      ? t.fileUnreadable
      : e.kind === 'noRows'
        ? t.fileNoRows
        : t.missingColumns(e.columns.join(', '))

/** File types offered by the picker. Broad on purpose: macOS, Safari and Windows label CSV files differently, and a narrow list greys them out. */
const ACCEPT = '.csv,text/csv,application/vnd.ms-excel,text/plain,.txt'

interface Props {
  t: Strings
  squad: SquadState
  onNext: () => void
}

/** Step 2: load a squad (own CSV or the synthetic sample) and see its birth-month skew. */
export function SquadStep({ t, squad, onNext }: Props) {
  const fileId = useId()
  const [dragging, setDragging] = useState(false)
  const { analysis, synthetic, issues, truncated, error } = squad

  const { loadedInfo } = squad
  const confirmation = useRef<HTMLParagraphElement>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    try {
      await squad.loadFile(file)
    } finally {
      // Clear the picker so choosing the same file again fires a new change event.
      input.value = ''
    }
  }

  // After every successful load, bring the confirmation and the results into view.
  const loadId = loadedInfo?.id
  useEffect(() => {
    if (loadId === undefined) return
    const line = confirmation.current
    if (!line) return
    // Focus first, then jump: an animated scroll can be cancelled by the focus change.
    line.focus({ preventScroll: true })
    line.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [loadId])

  const n = analysis?.players.length ?? 0
  const quarterCounts = analysis?.quarterCounts ?? [0, 0, 0, 0]
  const firstHalf = quarterCounts[0] + quarterCounts[1]
  const qLabels = quarterLabels(t.months, squad.cutoffMonth)
  const half = squad.cutoffMonth === 1 ? undefined : olderHalfLabel(t.months, squad.cutoffMonth)

  return (
    <div className="stack">
      <StepHeading t={t} step={2} title={t.stepNames.squad} lead={t.squadIntro} />

      <section className="card" aria-label={t.upload}>
        <p className="privacy" role="note">
          <span aria-hidden="true">🔒</span> {t.privacy}
        </p>
        <input id={fileId} className="sr-only" type="file" accept={ACCEPT} onChange={onFile} />
        <div
          className={`dropzone${dragging ? ' dropzone--over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void squad.loadFile(file)
          }}
        >
          <p className="dropzone__title">{t.dropTitle}</p>
          <label htmlFor={fileId} className="button button--primary">
            {t.upload}
          </label>
          <p className="help">{t.csvHelp}</p>
          <button type="button" className="link-button" onClick={() => downloadText('late-bloomers-template.csv', CSV_TEMPLATE)}>
            {t.downloadTemplate}
          </button>
        </div>
        <div className="or-sample">
          <span>{t.orSample}</span>
          <button type="button" className="button" onClick={squad.loadSample}>
            {t.loadSample}
          </button>
        </div>
        <DateField
          id="ref-date"
          label={t.assessmentDate}
          value={squad.refDate}
          onChange={squad.setRefDate}
          mode={t.dateInput}
          hint={t.dateHint}
          invalidMessage={t.dateInvalid}
        />
        <p className="help">{t.dateExplain}</p>
        <div className="field field--wide">
          <label htmlFor="cutoff">{t.cutoffLabel}</label>
          <select id="cutoff" value={squad.cutoffMonth} onChange={(e) => squad.setCutoffMonth(Number(e.target.value))}>
            {CUTOFF_MONTHS.map((m) => (
              <option key={m} value={m}>
                {t.cutoffOption(m)}
              </option>
            ))}
          </select>
          <span className="help">{t.cutoffHelp}</span>
        </div>
        <div className="field field--wide">
          <span className="field__label" id="direction-label">
            {t.directionLabel}
          </span>
          <div className="segmented segmented--row segmented--wrap" role="group" aria-labelledby="direction-label">
            <button type="button" aria-pressed={squad.higherIsBetter} onClick={() => squad.setHigherIsBetter(true)}>
              {t.directionHigher}
            </button>
            <button type="button" aria-pressed={!squad.higherIsBetter} onClick={() => squad.setHigherIsBetter(false)}>
              {t.directionLower}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="alert">
            {errorText(t, error)}
          </p>
        )}
        {(issues.length > 0 || truncated) && (
          <div role="status" className="alert alert--soft">
            {issues.length > 0 && (
              <>
                <p>{t.issues(issues.length)}</p>
                <ul>
                  {issues.slice(0, 8).map((i) => (
                    <li key={i.line}>{t.issueLine(i.line, t.issueReason[i.reason])}</li>
                  ))}
                </ul>
              </>
            )}
            {truncated && <p>{t.truncated(MAX_ROWS)}</p>}
          </div>
        )}
      </section>

      {analysis && loadedInfo && (
        <p ref={confirmation} className="loaded" role="status" tabIndex={-1}>
          <span aria-hidden="true">✓</span>{' '}
          {loadedInfo.fileName ? t.loadedFile(loadedInfo.count, loadedInfo.fileName) : t.loadedSample(loadedInfo.count)}
        </p>
      )}

      {analysis && (
        <>
          {synthetic && (
            <p className="synthetic" role="note">
              {t.syntheticBanner}
            </p>
          )}
          <section className="card" aria-labelledby="skew-title">
            <h3 id="skew-title">{t.skewTitle}</h3>
            <p className="big-line">{t.skewSummary(firstHalf, n, half)}</p>
            <p className="help">{t.skewNote}</p>
            <BarChart
              title={t.skewChart}
              bars={quarterCounts.map((c, i) => ({
                label: qLabels[i],
                value: n ? c / n : 0,
                display: `${c}`,
                tone: i === 0 ? 'early' : i === 3 ? 'late' : 'neutral',
                marker: i === 0 ? `▲ ${t.earlyBorn}` : i === 3 ? `▼ ${t.lateBorn}` : undefined,
              }))}
              expected={0.25}
              expectedLabel={t.expectedLine}
              formatShare={(v) => t.pct(v, 1)}
            />
            <div className="step-next">
              <button type="button" className="button button--primary button--next" onClick={onNext}>
                {t.squadNext} →
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
