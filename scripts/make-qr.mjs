// Writes the QR code for the live site as an SVG. Runs before every build; no external service.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode-generator'

const LIVE_URL = 'https://berbicanes.github.io/hackathon/'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'generated', 'qr.svg')

const qr = qrcode(0, 'M')
qr.addData(LIVE_URL)
qr.make()

const size = qr.getModuleCount()
const margin = 2
let path = ''
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    if (qr.isDark(row, col)) path += `M${col + margin} ${row + margin}h1v1h-1z`
  }
}
const total = size + margin * 2
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#16181d"/></svg>\n`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(`QR code for ${LIVE_URL} written to src/generated/qr.svg (${size}×${size} modules)`)
