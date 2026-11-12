import { useEffect, useRef } from 'react'
import type { ExplainRequest } from '../../worker/src/schema'
import type { Strings } from '../i18n'
import { summarisePlayer } from '../lib/playerCard'
import type { AnalysedPlayer } from '../lib/squad'
import { AiExplain } from './AiExplain'

interface Props {
  t: Strings
  quarterLabels: string[]
  player: AnalysedPlayer | null
  meanAgeMonths: number
  squadSize: number
  /** True when this child is on the squad's second-look list. */
  secondLook: boolean
  /** Builds the de-identified explanation payload for this child (numbers only). */
  explainPayload: (player: AnalysedPlayer) => ExplainRequest
  onClose: () => void
}

/** Plain-language card for one child, shown in a native modal dialog. */
export function PlayerCard({ t, quarterLabels, player, meanAgeMonths, squadSize, secondLook, explainPayload, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (player && !dialog.open) dialog.showModal()
    if (!player && dialog.open) dialog.close()
  }, [player])

  const summary = player ? summarisePlayer(player, meanAgeMonths, squadSize, secondLook) : null
  const advice = summary ? t.advice[summary.advice] : null
  const born = player ? t.formatDate(player.birthDate) : ''
  const ageLine = summary
    ? summary.monthsYounger > 0
      ? t.monthsYounger(summary.monthsYounger)
      : summary.monthsYounger < 0
        ? t.monthsOlder(-summary.monthsYounger)
        : t.averageAge
    : ''

  return (
    <dialog
      ref={ref}
      className="player-card"
      aria-labelledby="player-card-title"
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (outside the content box) closes the dialog.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {player && summary && advice && (
        <div className="player-card__body">
          <p className="kicker">{t.cardTitle}</p>
          <h2 id="player-card-title">{player.name}</h2>
          <p className="help">{t.cardBorn(born, quarterLabels[player.quarter - 1])}</p>
          <ul className="player-card__facts">
            <li>
              {ageLine}
              .
            </li>
            <li>{summary.topPercentForAge <= 50 ? t.cardTopForAge(summary.topPercentForAge) : t.cardDeveloping}</li>
            <li>{t.cardRanks(summary.rawRank, summary.fairRank, summary.squadSize)}</li>
          </ul>
          <div className={`advice advice--${summary.advice}`}>
            <p className="advice__label">{t.cardAdviceTitle}</p>
            <p className="advice__title">{advice.title}</p>
            <p>{advice.text}</p>
          </div>
          <AiExplain
            key={player.id}
            t={t}
            payload={() => explainPayload(player)}
            fallback={`${ageLine}. ${t.cardRanks(summary.rawRank, summary.fairRank, summary.squadSize)} ${advice.text}`}
          />
          <p className="help">{t.cardFooter}</p>
          <button type="button" className="button" onClick={onClose} autoFocus>
            {t.cardClose}
          </button>
        </div>
      )}
    </dialog>
  )
}
