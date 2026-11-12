import type { Strings } from '../i18n'

/** Three no-cost actions, one line each; the detail opens on tap. */
export function MondayPanel({ t }: { t: Strings }) {
  return (
    <section className="card monday" aria-labelledby="monday-title">
      <h3 id="monday-title">{t.mondayTitle}</h3>
      <div className="monday__list">
        {t.monday.map((item, i) => (
          <details key={item.title} className="monday__item">
            <summary>
              <span className="monday__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="monday__title">{item.title}</span>
            </summary>
            <p>{item.text}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
