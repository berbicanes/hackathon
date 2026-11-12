import { useEffect, useState } from 'react'
import { BiasMirror } from './components/BiasMirror'
import { YourSquad } from './components/YourSquad'
import { LANGS, strings, type Lang } from './i18n'

type Tab = 'bias' | 'squad'

const LANG_KEY = 'late-bloomers-lang'

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY)
    if (saved === 'bs' || saved === 'en') return saved
  } catch {
    // Storage can be unavailable (private mode, blocked site data); fall back to default.
  }
  return 'bs'
}

export default function App() {
  const [tab, setTab] = useState<Tab>('bias')
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = strings[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(LANG_KEY, lang)
    } catch {
      // Not critical: the choice just will not be remembered.
    }
  }, [lang])

  const goToSquad = () => {
    setTab('squad')
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
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
          <div className="segmented segmented--small" role="group" aria-label={t.langSwitch}>
            {LANGS.map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {strings[l].langName}
              </button>
            ))}
          </div>
        </div>
        <nav className="container tabs" aria-label={t.navLabel}>
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
        {tab === 'bias' ? <BiasMirror t={t} onGoToSquad={goToSquad} /> : <YourSquad t={t} />}
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
