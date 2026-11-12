import type { Strings } from '../i18n'

export function MondayPanel({ t }: { t: Strings }) {
  return (
    <section className="card monday" aria-labelledby="monday-title">
      <h2 id="monday-title">{t.mondayTitle}</h2>
      <p className="help">{t.mondayIntro}</p>
      <ol className="monday__list">
        {t.monday.map((item, i) => (
          <li key={item.title}>
            <span className="monday__num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
