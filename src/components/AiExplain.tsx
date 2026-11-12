import { useState } from 'react'
import type { ExplainRequest } from '../../worker/src/schema'
import { EXPLAIN_ENDPOINT } from '../config'
import type { Strings } from '../i18n'
import { requestExplanation } from '../lib/explain'

interface Props {
  t: Strings
  /** Builds the de-identified payload at click time; nothing is prepared or sent before that. */
  payload: () => ExplainRequest
  /** The app's own deterministic explanation, shown when the AI is off, slow or failing. */
  fallback: string
}

type State = { status: 'idle' } | { status: 'loading' } | { status: 'ai'; text: string } | { status: 'fallback' }

/**
 * Optional "Explain (AI)" button. The math has already decided; the AI only puts the
 * numbers into words. AI text is always marked as AI-generated, and any failure shows
 * the deterministic text instead.
 */
export function AiExplain({ t, payload, fallback }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })

  const onClick = async () => {
    setState({ status: 'loading' })
    const result = await requestExplanation(payload(), { endpoint: EXPLAIN_ENDPOINT })
    setState(result.source === 'ai' ? { status: 'ai', text: result.text } : { status: 'fallback' })
  }

  return (
    <div className="ai">
      {(state.status === 'idle' || state.status === 'loading') && (
        <div className="ai__ask">
          <button type="button" className="button ai__button" onClick={onClick} disabled={state.status === 'loading'}>
            <span aria-hidden="true">✦</span> {t.aiButton}
          </button>
          <span className="ai__note">{t.aiNote}</span>
        </div>
      )}
      <div aria-live="polite">
        {state.status === 'loading' && (
          <p className="ai__loading" role="status">
            {t.aiLoading}
          </p>
        )}
        {state.status === 'ai' && (
          <div className="ai__result ai__result--ai">
            <p className="ai__badge">
              <span aria-hidden="true">✦</span> {t.aiBadge}
            </p>
            <p>{state.text}</p>
            <p className="ai__note">{t.aiDisclaimer}</p>
          </div>
        )}
        {state.status === 'fallback' && (
          <div className="ai__result">
            <p className="ai__badge ai__badge--plain">{t.aiFallbackBadge}</p>
            <p>{fallback}</p>
            <p className="ai__note">{t.aiFallbackNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}
