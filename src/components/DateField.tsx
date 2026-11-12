import { useState } from 'react'
import { isoToDmy, parseDmy } from '../lib/format'

interface Props {
  id: string
  label: string
  /** ISO day, yyyy-mm-dd. */
  value: string
  onChange: (iso: string) => void
  /** 'dmy' shows and accepts dd.mm.yyyy regardless of the browser's own locale. */
  mode: 'dmy' | 'native'
  hint: string
  invalidMessage: string
}

/**
 * Date input. Native date pickers follow the browser's locale, not the page language, so
 * the Bosnian UI uses a text field that always reads dd.mm.yyyy.
 */
export function DateField({ id, label, value, onChange, mode, hint, invalidMessage }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  if (mode === 'native') {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input id={id} type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
      </div>
    )
  }

  const shown = draft ?? isoToDmy(value)
  const invalid = draft !== null && parseDmy(draft) === null
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <span className="field__hint">({hint})</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={hint}
        maxLength={11}
        value={shown}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onFocus={() => setDraft(isoToDmy(value))}
        onChange={(e) => {
          setDraft(e.target.value)
          const iso = parseDmy(e.target.value)
          if (iso) onChange(iso)
        }}
        onBlur={() => setDraft(null)}
      />
      {invalid && (
        <span id={`${id}-error`} className="field__error" role="alert">
          {invalidMessage}
        </span>
      )}
    </div>
  )
}
