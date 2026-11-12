import type { Strings } from '../i18n'

/** Same heading block on every step: "Step 2 of 3", title, one plain sentence. */
export function StepHeading({ t, step, title, lead }: { t: Strings; step: number; title: string; lead: string }) {
  return (
    <div className="step-heading">
      <p className="kicker">{t.stepOf(step, 3)}</p>
      <h2 className="step-heading__title">{title}</h2>
      <p className="step-heading__lead">{lead}</p>
    </div>
  )
}
