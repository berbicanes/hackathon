import { describe, expect, it } from 'vitest'
import { buildUserMessage, SYSTEM_PROMPT } from '../../worker/src/prompt'
import { buildChildPayload, buildSquadPayload } from './explain'
import { sampleSquad, SAMPLE_REFERENCE_DATE } from './sample'
import { analyseSquad, recommendGroup } from './squad'

const analysis = analyseSquad(sampleSquad(), SAMPLE_REFERENCE_DATE)
const group = recommendGroup(analysis.players, 10, analysis.fit)

describe('explanation prompt: the model explains, it does not decide', () => {
  it('sets the guard rails', () => {
    for (const rule of [
      '3 to 4 short, simple sentences that a parent',
      'standard Bosnian (ijekavica',
      'at most one decimal place',
      'write 83, not 83.03',
      'decimal comma (2,2)',
      'Never mention the names of the JSON fields',
      'Use only the numbers and facts in the JSON',
      'Never invent',
      'Never say or imply that a child is bad',
      'should be cut or dropped',
      'take a second look',
      'say plainly that the estimate is uncertain',
      'you only explain it',
    ]) {
      expect(SYSTEM_PROMPT).toContain(rule)
    }
  })
  it('does not teach the model the internal field names', () => {
    for (const field of ['agePerMonth', 'agePerMonthLow', 'higherIsBetter', 'adjustedScore', 'monthsYoungerThanAverage']) {
      expect(SYSTEM_PROMPT).not.toContain(field)
    }
  })
  it('gives the model nothing but the validated numbers', () => {
    const ena = analysis.players.find((p) => p.name === 'Ena') as (typeof analysis.players)[number]
    const payload = buildChildPayload(analysis, group, ena, 'bs')
    const message = buildUserMessage(payload)
    expect(JSON.parse(message)).toEqual({ kind: 'child', language: 'bs', squad: payload.squad, child: payload.child })
    for (const player of analysis.players) expect(message).not.toContain(player.name)
    expect(message).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
  it('leaves the child out of a squad-level request', () => {
    const message = JSON.parse(buildUserMessage(buildSquadPayload(analysis, group, 'en')))
    expect(Object.keys(message).sort()).toEqual(['kind', 'language', 'squad'])
  })
})
