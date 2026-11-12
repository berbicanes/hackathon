import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Shows a friendly bilingual message instead of a blank page if rendering fails. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Stays in the browser console only; nothing is reported anywhere.
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="container">
        <div className="card" role="alert">
          <h2>Nešto nije u redu · Something went wrong</h2>
          <p>Osvježite stranicu. Vaši podaci nisu nigdje poslani. · Please reload the page. Your data was not sent anywhere.</p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Osvježi · Reload
          </button>
        </div>
      </main>
    )
  }
}
