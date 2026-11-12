import { Component, type ReactNode } from 'react'
import { currentStrings } from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Shows a friendly message in the current language instead of a blank page if rendering
 * fails. React already reports the caught error to the browser console; nothing is sent anywhere.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = currentStrings()
    return (
      <main className="container">
        <div className="card" role="alert">
          <h2>{t.errorTitle}</h2>
          <p>{t.errorText}</p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            {t.errorReload}
          </button>
        </div>
      </main>
    )
  }
}
