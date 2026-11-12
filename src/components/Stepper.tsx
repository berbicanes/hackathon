import type { Strings } from '../i18n'
import { STEPS, type Step } from '../steps'

interface Props {
  t: Strings
  current: Step | null
}

/**
 * Three-step navigation. Every step is a real link (#problem, #squad, #decision), so it
 * works with the keyboard, the back button and direct links. Wide screens show all
 * steps; narrow screens show "Step 2 of 3" with previous/next.
 */
export function Stepper({ t, current }: Props) {
  const index = current ? STEPS.indexOf(current) : -1
  const prev = index > 0 ? STEPS[index - 1] : null
  const next = index >= 0 && index < STEPS.length - 1 ? STEPS[index + 1] : index === -1 ? STEPS[0] : null

  return (
    <nav className="stepper" aria-label={t.navLabel}>
      <ol className="stepper__list">
        {STEPS.map((step, i) => (
          <li key={step}>
            <a
              href={`#${step}`}
              className="stepper__step"
              aria-current={step === current ? 'step' : undefined}
              data-done={index > i ? '' : undefined}
            >
              <span className="stepper__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="sr-only">{t.stepWord} {i + 1}: </span>
              {t.stepNames[step]}
            </a>
          </li>
        ))}
      </ol>
      <div className="stepper__compact">
        {prev ? (
          <a href={`#${prev}`} className="stepper__arrow" aria-label={`${t.stepPrev}: ${t.stepNames[prev]}`}>
            ←
          </a>
        ) : (
          <span className="stepper__arrow" aria-hidden="true" data-disabled="" />
        )}
        <span className="stepper__where">
          {index >= 0 ? (
            <>
              <span className="stepper__count">{t.stepOf(index + 1, STEPS.length)}</span>
              <strong>{t.stepNames[STEPS[index]]}</strong>
            </>
          ) : (
            <strong>{t.privacyTitle}</strong>
          )}
        </span>
        {next ? (
          <a href={`#${next}`} className="stepper__arrow" aria-label={`${t.stepNext}: ${t.stepNames[next]}`}>
            →
          </a>
        ) : (
          <span className="stepper__arrow" aria-hidden="true" data-disabled="" />
        )}
      </div>
    </nav>
  )
}
