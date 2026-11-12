import { useEffect, useRef } from 'react'
import type { Strings } from '../i18n'
import { summarisePlayer } from '../lib/playerCard'
import type { AnalysedPlayer } from '../lib/squad'

interface Props {
  t: Strings
  quarterLabels: string[]
  player: AnalysedPlayer | null
  meanAgeMonths: number
  squadSize: number
  onClose: () => void
}

/** Plain-language card for one child, shown in a native modal dialog. */
export function PlayerCard({ t, quarterLabels, player, meanAgeMonths, squadSize, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (player && !dialog.open) dialog.showModal()
    if (!player && dialog.open) dialog.close()
  }, [player])

  const summary = player ? summarisePlayer(player, meanAgeMonths, squadSize) : null
  const advice = summary ? t.advice[summary.advice] : null
  const born = player ? t.formatDate(player.birthDate) : ''

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
              {summary.monthsYounger > 0
                ? t.monthsYounger(summary.monthsYounger)
                : summary.monthsYounger < 0
                  ? t.monthsOlder(-summary.monthsYounger)
                  : t.averageAge}
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
          <p className="help">{t.cardFooter}</p>
          <button type="button" className="button" onClick={onClose} autoFocus>
            {t.cardClose}
          </button>
        </div>
      )}
    </dialog>
  )
}
