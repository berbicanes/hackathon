export const STEPS = ['problem', 'squad', 'decision'] as const
export type Step = (typeof STEPS)[number]
