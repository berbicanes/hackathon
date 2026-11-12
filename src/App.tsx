import { useState } from 'react'
import { BiasMirror } from './components/BiasMirror'
import { YourSquad } from './components/YourSquad'
import { strings } from './i18n'

type Tab = 'bias' | 'squad'

export default function App() {
  const [tab, setTab] = useState<Tab>('bias')
  const t = strings.en

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <div>
            <h1 className="brand">
              <span className="brand__mark" aria-hidden="true">
                ✿
              </span>
              {t.appName}
            </h1>
            <p className="tagline">{t.tagline}</p>
          </div>
        </div>
        <nav className="container tabs" aria-label="Sections">
          {(['bias', 'squad'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="tabs__tab"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              {id === 'bias' ? t.tabBias : t.tabSquad}
            </button>
          ))}
        </nav>
      </header>

      <main id="main" className="container">
        {tab === 'bias' ? <BiasMirror t={t} /> : <YourSquad t={t} />}
      </main>

      <footer className="container site-footer">
        <p>
          <span aria-hidden="true">🔒</span> {t.privacy}
        </p>
        <p>{t.footerData}</p>
      </footer>
    </>
  )
}
