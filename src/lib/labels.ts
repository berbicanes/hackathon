/** Label placement for the scatter plot: names next to dots, never on top of each other. */

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const LABEL_HEIGHT = 16
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * Places each name next to its dot without covering another name or any dot. Positions
 * are tried from closest to farthest around the dot; a label that has to move away gets
 * a leader line back to its dot.
 */
export function placeLabels(
  targets: { id: number; name: string; x: number; y: number }[],
  dots: { x: number; y: number }[],
  bounds: { left: number; right: number; top: number; bottom: number },
  r: number,
) {
  const dotBoxes: Box[] = dots.map((d) => ({ x: d.x - r - 1, y: d.y - r - 1, w: 2 * r + 2, h: 2 * r + 2 }))
  const placed: Box[] = []
  return targets.map((t) => {
    const w = t.name.length * 7.8 + 6
    const candidates: Box[] = []
    for (const gap of [r + 3, r + 14, r + 28, r + 44, r + 62, r + 82]) {
      for (const [dx, dy] of [[1, -1], [1, 1], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, 0], [-1, 0]]) {
        const bx = dx > 0 ? t.x + gap : dx < 0 ? t.x - gap - w : t.x - w / 2
        const by = dy < 0 ? t.y - gap - LABEL_HEIGHT : dy > 0 ? t.y + gap : t.y - LABEL_HEIGHT / 2
        candidates.push({ x: bx, y: by, w, h: LABEL_HEIGHT })
      }
    }
    const inside = (b: Box) => b.x >= bounds.left && b.x + b.w <= bounds.right && b.y >= bounds.top && b.y + b.h <= bounds.bottom
    const free = (b: Box) => inside(b) && !placed.some((o) => overlaps(b, o)) && !dotBoxes.some((o) => overlaps(b, o))
    const box = candidates.find(free) ?? candidates.find((b) => inside(b) && !placed.some((o) => overlaps(b, o))) ?? candidates[0]
    placed.push(box)
    // Leader line from the dot to the nearest point of the label box.
    const anchorX = Math.max(box.x, Math.min(t.x, box.x + box.w))
    const anchorY = Math.max(box.y, Math.min(t.y, box.y + box.h))
    const leader = Math.hypot(anchorX - t.x, anchorY - t.y) > r + 10
    return { id: t.id, name: t.name, box, dotX: t.x, dotY: t.y, anchorX, anchorY, leader }
  })
}
