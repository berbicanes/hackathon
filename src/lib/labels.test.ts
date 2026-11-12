import { describe, expect, it } from 'vitest'
import { placeLabels } from './labels'

interface Box {
  x: number
  y: number
  w: number
  h: number
}
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const bounds = { left: 40, right: 340, top: 2, bottom: 250 }

describe('placeLabels', () => {
  it('never lets two names overlap, even for dots that sit on top of each other', () => {
    const targets = [
      { id: 1, name: 'Ena', x: 60, y: 180 },
      { id: 2, name: 'Benjamin', x: 62, y: 184 },
      { id: 3, name: 'Hana', x: 66, y: 181 },
      { id: 4, name: 'Aleksandar', x: 61, y: 178 },
    ]
    const dots = [...targets, { x: 200, y: 100 }, { x: 210, y: 90 }]
    const labels = placeLabels(targets, dots, bounds, 6)
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) expect(overlaps(labels[i].box, labels[j].box)).toBe(false)
    }
  })
  it('keeps names inside the plot and off the dots', () => {
    const targets = [{ id: 1, name: 'Benjamin', x: 335, y: 10 }]
    const dots = [{ x: 335, y: 10 }, { x: 320, y: 12 }]
    const [label] = placeLabels(targets, dots, bounds, 6)
    expect(label.box.x).toBeGreaterThanOrEqual(bounds.left)
    expect(label.box.x + label.box.w).toBeLessThanOrEqual(bounds.right)
    expect(label.box.y).toBeGreaterThanOrEqual(bounds.top)
    for (const d of dots) expect(overlaps(label.box, { x: d.x - 6, y: d.y - 6, w: 12, h: 12 })).toBe(false)
  })
  it('draws a leader line only when the name had to move away from its dot', () => {
    const [near] = placeLabels([{ id: 1, name: 'Ena', x: 100, y: 100 }], [{ x: 100, y: 100 }], bounds, 6)
    expect(near.leader).toBe(false)
    const crowded = placeLabels(
      [{ id: 1, name: 'Ena', x: 100, y: 100 }],
      [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => ({ x: 100 + i * 14, y: 100 + j * 14 }))),
      bounds,
      6,
    )
    expect(crowded[0].leader).toBe(true)
  })
})
