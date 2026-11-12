import { useEffect, useState } from 'react'
import { BiasMirror } from './components/BiasMirror'
import { DecisionStep } from './components/DecisionStep'
import { Pitch } from './components/Pitch'
import { Privacy } from './components/Privacy'
import { SquadStep } from './components/SquadStep'
import { Stepper } from './components/Stepper'
import { LANGS, strings, type Lang } from './i18n'
import { STEPS, type Step } from './steps'
import { useSquad } from './useSquad'

type Route = Step | 'privacy' | 'pitch'

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

/** Each step has its own address: #problem, #squad, #decision (and #privacy). */
function routeFromHash(): Route {
  const hash = window.location.hash.slice(1)
  if (hash === 'privacy' || hash === 'pitch') return hash
  return (STEPS as readonly string[]).includes(hash) ? (hash as Step) : 'problem'
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [lang, setLang] = useState<Lang>(initialLang)
  const squad = useSquad()
  const t = strings[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(LANG_KEY, lang)
    } catch {
      // Not critical: the choice just will not be remembered.
    }
  }, [lang])

  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goTo = (next: Route) => {
    if (window.location.hash === `#${next}`) return
    window.location.hash = next
  }

  // The pitch deck takes the whole screen: no header, stepper or footer around it.
  if (route === 'pitch') return <Pitch t={t} lang={lang} setLang={setLang} onExit={() => goTo('problem')} />

  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="#problem" aria-label={`${t.appName}: ${t.tagline}`}>
            <span className="brand__mark" aria-hidden="true">
              ✿
            </span>
            <h1 className="brand__name">{t.appName}</h1>
          </a>
          <Stepper t={t} current={route === 'privacy' ? null : route} />
          <div className="segmented segmented--small lang" role="group" aria-label={t.langSwitch}>
            {LANGS.map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                <span className="lang__full">{strings[l].langName}</span>
                <span className="lang__short" aria-hidden="true">
                  {l.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="main" className="container">
        {route === 'problem' && <BiasMirror t={t} onGoToSquad={() => goTo('squad')} />}
        {route === 'squad' && <SquadStep t={t} squad={squad} onNext={() => goTo('decision')} />}
        {route === 'decision' && <DecisionStep t={t} squad={squad} onBack={() => goTo('squad')} />}
        {route === 'privacy' && <Privacy t={t} onBack={() => goTo('problem')} />}
      </main>

      <footer className="container site-footer">
        <p>
          <span aria-hidden="true">🔒</span> {t.privacy}
        </p>
        <p>{t.footerData}</p>
        <p>
          <a href="#privacy">{t.privacyLink}</a> · <a href="#pitch">{t.pitchLink}</a>
        </p>
      </footer>
    </>
  )
}
