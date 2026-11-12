import { useEffect, useState } from 'react'

interface YouthGroup {
  n: number
  quarter_share: number[]
  q1_q4_ratio: number
  p_value: number
  significant_at_05: boolean
  source: string
}

export interface YouthData {
  boys: YouthGroup
  girls: YouthGroup
}

const isGroup = (g: YouthGroup | undefined) => Boolean(g && Array.isArray(g.quarter_share) && g.quarter_share.length === 4 && g.n > 0)
const isYouthData = (x: unknown): x is YouthData => isGroup((x as YouthData)?.boys) && isGroup((x as YouthData)?.girls)

/** Loads the aggregate youth figures; null until loaded or if they are unavailable. */
export function useYouthData(): YouthData | null {
  const [data, setData] = useState<YouthData | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/youth.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => isYouthData(json) && setData(json))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])
  return data
}
