import type { Strings } from '../i18n'

const PRIVACY_CONTACT_URL = 'https://github.com/berbicanes/hackathon/issues'

export function Privacy({ t, onBack }: { t: Strings; onBack: () => void }) {
  return (
    <div className="stack">
      <section className="card privacy-page" aria-labelledby="privacy-title">
        <h2 id="privacy-title">{t.privacyTitle}</h2>
        <p className="big-line">{t.privacyLead}</p>
        {t.privacySections.map((s) => (
          <div key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
        <div>
          <h3>{t.privacyContactTitle}</h3>
          <p>
            {t.privacyContactText}{' '}
            <a href={PRIVACY_CONTACT_URL} rel="noopener noreferrer">
              github.com/berbicanes/hackathon/issues
            </a>
          </p>
        </div>
        <p className="help">{t.privacyUpdated}</p>
        <div className="actions">
          <button type="button" className="button button--ghost" onClick={onBack}>
            ← {t.privacyBack}
          </button>
        </div>
      </section>
    </div>
  )
}
