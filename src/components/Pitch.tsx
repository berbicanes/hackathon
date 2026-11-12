import { useCallback, useEffect, useMemo, useState } from 'react'
import qrUrl from '../generated/qr.svg'
import { LANGS, strings, type Lang, type Strings } from '../i18n'
import { EDGE_CASES_TESTED } from '../lib/edgeCaseCount'
import { sampleSquad, SAMPLE_REFERENCE_DATE } from '../lib/sample'
import { analyseSquad, quarterLabels, recommendGroup } from '../lib/squad'
import { ScatterPlot } from './ScatterPlot'

interface PitchData {
  under_21: { n: number; quarter_share: number[]; q1_q4_ratio: number; chi_square_quarters: { p_value: number } }
  cutoff_robustness: { rows: { id: string; ratio: number }[] }
}

const LIVE_URL = 'https://berbicanes.github.io/hackathon/'
const MAIN_SLIDES = 4
const BACKUP = MAIN_SLIDES

interface Props {
  t: Strings
  lang: Lang
  setLang: (lang: Lang) => void
  onExit: () => void
}

/**
 * The 3-minute pitch as slides inside the app (#pitch). Four main slides and one backup
 * slide that is outside the main sequence. Keyboard: → / space / click next, ← back,
 * B backup, F fullscreen, Esc exit. Every slide prints on its own landscape page.
 */
export function Pitch({ t, lang, setLang, onExit }: Props) {
  const [slide, setSlide] = useState(0)
  const [data, setData] = useState<PitchData | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/rae.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: PitchData | null) => json?.under_21 && setData(json))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const next = useCallback(() => setSlide((s) => (s >= MAIN_SLIDES - 1 ? s : s + 1)), [])
  const prev = useCallback(() => setSlide((s) => (s === BACKUP ? MAIN_SLIDES - 1 : Math.max(0, s - 1))), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'arrowright' || key === ' ' || key === 'pagedown' || key === 'enter') {
        // Let buttons and links keep their own Enter/Space behaviour.
        if ((key === ' ' || key === 'enter') && e.target instanceof HTMLElement && e.target.closest('a, button')) return
        e.preventDefault()
        next()
      } else if (key === 'arrowleft' || key === 'pageup') {
        e.preventDefault()
        prev()
      } else if (key === 'b') {
        setSlide((s) => (s === BACKUP ? MAIN_SLIDES - 1 : BACKUP))
      } else if (key === 'f') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen?.().catch(() => undefined)
      } else if (key === 'escape' && !document.fullscreenElement) {
        onExit()
      } else if (key === 'home') {
        setSlide(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onExit])

  const sample = useMemo(() => {
    const analysis = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
    return { analysis, group: recommendGroup(analysis.players, 10, analysis.fit) }
  }, [])

  const u21 = data?.under_21
  const japan = data?.cutoff_robustness.rows.find((r) => r.id === 'japan_u21')
  const pExponent = u21 ? Math.round(Math.log10(u21.chi_square_quarters.p_value)) : null
  const superscript = (n: number) => String(n).replace(/[-\d]/g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)])
  const isCurrent = (i: number) => (slide === i ? ' pitch__slide--current' : '')

  return (
    <div className="pitch" lang={lang}>
      <div
        className="pitch__stage"
        onClick={(e) => {
          if (!(e.target instanceof HTMLElement) || e.target.closest('a, button')) return
          next()
        }}
      >
        <section className={`pitch__slide pitch__slide--hook${isCurrent(0)}`} aria-hidden={slide !== 0} aria-label={t.pitch.hookTitle}>
          <p className="pitch__kicker">Late Bloomers</p>
          <h2 className="pitch__title">{t.pitch.hookTitle}</h2>
          <div className="pitch__versus" aria-hidden="true">
            <div className="pitch__kid pitch__kid--early">
              <span className="pitch__kid-figure pitch__kid-figure--tall" />
              <strong>{t.pitch.hookJanuary}</strong>
              <span>{t.pitch.hookJanuaryAge}</span>
            </div>
            <div className="pitch__kid pitch__kid--late">
              <span className="pitch__kid-figure" />
              <strong>{t.pitch.hookDecember}</strong>
              <span>{t.pitch.hookDecemberAge}</span>
            </div>
          </div>
          <p className="pitch__sub">{t.pitch.hookSub}</p>
        </section>

        <section className={`pitch__slide${isCurrent(1)}`} aria-hidden={slide !== 1} aria-label={t.pitch.problemTitle}>
          <p className="pitch__kicker">{t.pitch.problemKicker}</p>
          <div className="pitch__stats">
            <div className="pitch__stat pitch__stat--early">
              <span className="pitch__number">{u21 ? t.pct(u21.quarter_share[0]) : '…'}</span>
              <span>{t.pitch.problemEarly}</span>
            </div>
            <div className="pitch__stat pitch__stat--late">
              <span className="pitch__number">{u21 ? t.pct(u21.quarter_share[3]) : '…'}</span>
              <span>{t.pitch.problemLate}</span>
            </div>
            <div className="pitch__stat">
              <span className="pitch__number">{u21 ? `${t.num(u21.q1_q4_ratio, 1)}×` : '…'}</span>
              <span>{t.pitch.problemRatio}</span>
            </div>
          </div>
          <p className="pitch__line">{t.pitch.problemJapan(japan ? t.num(japan.ratio, 1) : '…')}</p>
          <p className="pitch__source">
            {u21 && pExponent !== null ? t.pitch.problemSource(t.num(u21.n), `10${superscript(pExponent)}`) : ''}
          </p>
        </section>

        <section className={`pitch__slide${isCurrent(2)}`} aria-hidden={slide !== 2} aria-label={t.pitch.solutionTitle}>
          <p className="pitch__kicker">{t.pitch.solutionKicker}</p>
          <h2 className="pitch__title">{t.pitch.solutionTitle}</h2>
          <ol className="pitch__steps">
            {(['problem', 'squad', 'decision'] as const).map((step, i) => (
              <li key={step}>
                <span className="pitch__step-num">{i + 1}</span>
                <strong>{t.stepNames[step]}</strong>
                <span>{t.pitch.solutionSteps[i]}</span>
              </li>
            ))}
          </ol>
          <a className="button button--primary pitch__demo" href="#problem">
            {t.pitch.demo} →
          </a>
        </section>

        <section className={`pitch__slide pitch__slide--close${isCurrent(3)}`} aria-hidden={slide !== 3} aria-label={t.pitch.closeTitle}>
          <div className="pitch__close-text">
            <h2 className="pitch__title">{t.pitch.closeTitle}</h2>
            <ul className="pitch__trust">
              <li>{t.pitch.trustPrivacy}</li>
              <li>{t.pitch.trustCases(EDGE_CASES_TESTED)}</li>
              <li>{t.pitch.trustProdReady}</li>
            </ul>
            <p className="pitch__url">{LIVE_URL.replace('https://', '')}</p>
          </div>
          <img className="pitch__qr" src={qrUrl} alt={t.pitch.qrAlt(LIVE_URL)} />
        </section>

        <section className={`pitch__slide pitch__slide--backup${isCurrent(BACKUP)}`} aria-hidden={slide !== BACKUP} aria-label={t.pitch.backupTitle}>
          <p className="pitch__kicker">{t.pitch.backupKicker}</p>
          <h2 className="pitch__title pitch__title--small">{t.pitch.backupTitle}</h2>
          <div className="pitch__how">
            <div className="pitch__how-chart">
              <ScatterPlot
                t={t}
                players={sample.analysis.players}
                fit={sample.analysis.fit}
                highlighted={sample.group.secondLook}
                quarterLabels={quarterLabels(t.months, 1)}
              />
            </div>
            <ul className="pitch__how-points">
              {t.pitch.backupPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <p className="pitch__source">{t.syntheticShort}</p>
        </section>
      </div>

      <nav className="pitch__bar" aria-label={t.pitch.controls}>
        <button type="button" className="pitch__ctrl" onClick={onExit}>
          ✕ <span>{t.pitch.exit}</span>
        </button>
        <button type="button" className="pitch__ctrl" onClick={prev} disabled={slide === 0} aria-label={t.stepPrev}>
          ←
        </button>
        <span className="pitch__counter" aria-live="polite">
          {slide === BACKUP ? t.pitch.backupLink : `${slide + 1} / ${MAIN_SLIDES}`}
        </span>
        <button type="button" className="pitch__ctrl" onClick={next} disabled={slide >= MAIN_SLIDES - 1} aria-label={t.stepNext}>
          →
        </button>
        <button type="button" className="pitch__ctrl" aria-pressed={slide === BACKUP} onClick={() => setSlide((s) => (s === BACKUP ? MAIN_SLIDES - 1 : BACKUP))}>
          {t.pitch.backupLink}
        </button>
        <span className="pitch__langs" role="group" aria-label={t.langSwitch}>
          {LANGS.map((l) => (
            <button key={l} type="button" className="pitch__ctrl" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} aria-label={strings[l].langName}>
              {l.toUpperCase()}
            </button>
          ))}
        </span>
        <span className="pitch__keys">{t.pitch.keys}</span>
      </nav>
    </div>
  )
}
