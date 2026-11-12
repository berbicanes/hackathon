import { expect, test } from '@playwright/test'

/** The explanation proxy. Tests never reach the real one: every call is intercepted. */
const AI_ORIGIN = 'https://late-bloomers-explain.berbicanes6.workers.dev'

test('coach journey: evidence, sample squad, fair selection, player card', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Content-Security-Policy violations are reported on the console.
  page.on('console', (m) => m.type() === 'error' && !m.location().url.startsWith(AI_ORIGIN) && errors.push(m.text()))
  // The page must not call any third party (fonts are self-hosted). The one allowed
  // exception is the explanation proxy, and only after a click on "Explain (AI)".
  const origin = new URL(test.info().project.use.baseURL!).origin
  const aiCalls: string[] = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.origin === AI_ORIGIN) aiCalls.push(r.postData() ?? '')
    else if (url.protocol.startsWith('http') && url.origin !== origin) errors.push(`third-party request: ${r.url()}`)
  })
  // In this journey the proxy is "down", so the app must fall back to its own explanation.
  await page.route(`${AI_ORIGIN}/**`, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"busy"}' }))

  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Late Bloomers')
  await page.setViewportSize({ width: 1366, height: 900 })
  await expect(page.locator('html')).toHaveAttribute('lang', 'bs')

  // Bias mirror loads the analysis and shows the headline share.
  await expect(page.locator('.hero__number')).toContainText('32')
  expect(await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check("16px 'Inter'") && document.fonts.check("700 32px 'Space Grotesk'")))).toBe(true)

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // Robustness checks are collapsed by default and open from the summary.
  const analysts = page.locator('details.analysts')
  await expect(analysts).not.toHaveAttribute('open', '')
  await expect(page.locator('#cutoff-title')).toBeHidden()
  await analysts.locator('summary').click()
  await expect(page.locator('#cutoff-title')).toBeVisible()

  const underdog = page.locator('section[aria-labelledby="underdog-title"]')
  await expect(underdog.getByRole('row', { name: /22-25/ })).toContainText('Yes, still holds')
  await expect(underdog.getByRole('row', { name: /26-29/ })).toContainText('No, does not hold')
  await expect(page.locator('.hero__sub')).toContainText('1.8× as common as late-born players (October–December) among under-21 pros')
  await expect(page.locator('.also')).toContainText('Japan')

  // Cut-off robustness check is shown with England measured from 1 September.
  const cutoff = page.locator('section[aria-labelledby="cutoff-title"]')
  await expect(cutoff.getByRole('row', { name: /England under 21, own cut-off/ })).toContainText('1 Sep')
  await expect(cutoff.locator('tbody tr')).toHaveCount(8)

  // Step 1 ends with one button to step 2; every step has its own address.
  const stepper = page.getByRole('navigation', { name: 'Steps' })
  await expect(stepper.getByRole('link', { name: /The problem/ })).toHaveAttribute('aria-current', 'step')
  await page.getByRole('button', { name: /Check your own squad/ }).click()
  await expect(page).toHaveURL(/#squad$/)
  await expect(stepper.getByRole('link', { name: /Your squad/ })).toHaveAttribute('aria-current', 'step')

  // Step 3 without a squad sends the coach back to step 2.
  await stepper.getByRole('link', { name: /Decision/ }).click()
  await page.getByRole('button', { name: /Go to Your squad/ }).click()
  await expect(page).toHaveURL(/#squad$/)

  // Step 2: the synthetic sample.
  await page.getByRole('button', { name: 'Try with the sample' }).click()
  await expect(page.locator('.synthetic')).toContainText('SYNTHETIC SAMPLE')
  await expect(page.getByText('14 of 20 players were born in the first half of the year.')).toBeVisible()

  // In Bosnian the assessment date always reads dd.mm.yyyy, whatever the browser locale.
  await page.getByRole('button', { name: 'Bosanski' }).click()
  const date = page.getByLabel(/Datum testiranja/)
  await expect(date).toHaveValue(/^\d{2}\.\d{2}\.\d{4}$/)
  const sampleDate = await date.inputValue()
  await date.fill('31.02.2026')
  await expect(date).toHaveAttribute('aria-invalid', 'true')
  await date.fill(sampleDate)
  await expect(date).toHaveAttribute('aria-invalid', 'false')
  await date.blur()
  await expect(date).toHaveValue(sampleDate)
  await page.getByRole('button', { name: 'English' }).click()

  // Step 3: the decision.
  await page.getByRole('button', { name: /See the decision/ }).click()
  await expect(page).toHaveURL(/#decision$/)
  await expect(page.locator('.squad-table tbody tr')).toHaveCount(20)

  // Default view is a wider group, not a swap: nobody is shown as dropped.
  await expect(page.locator('#recommend-title')).toHaveText('Widen the group by 3 places: 3 late-born talents')
  await expect(page.locator('.recommend')).toContainText('Second look — reassess in 6 months')
  await expect(page.locator('.squad-table tr.is-second')).toHaveCount(3)
  await expect(page.locator('.recommend')).not.toContainText('Borderline')
  await expect(page.locator('.synthetic')).toContainText('SYNTHETIC SAMPLE')
  await expect(page.locator('.squad-table tr.is-lost')).toHaveCount(0)
  await expect(page.locator('.squad-table')).not.toContainText('Drops out')

  await expect(page.locator('.trend-line')).toHaveText(/^≈ 2\.2 points per month of age, range \d\.\d–\d\.\d\.\s*$/)

  // Optional AI explanation: clearly labelled, and the app's own text when the AI is unavailable.
  const ai = page.locator('.recommend .ai')
  expect(aiCalls).toEqual([])
  await expect(ai).toContainText('AI explanation — only anonymous numbers are sent, no names.')
  await ai.getByRole('button', { name: /Explain \(AI\)/ }).click()
  await expect(ai.locator('.ai__badge')).toHaveText('Explanation without AI')
  await expect(ai.locator('.ai__result')).toContainText('Widen the group by 3 places: 3 late-born talents.')
  await expect(ai.locator('.ai__result')).toContainText('≈ 2.2 points per month of age')
  await expect(ai.locator('.ai__result--ai')).toHaveCount(0)
  expect(aiCalls).toHaveLength(1)

  // "How it works": one dot per child, the trend line, hidden talents named.
  const scatter = page.locator('figure.scatter')
  await expect(scatter.locator('.scatter__dot')).toHaveCount(20 + 4)
  await expect(scatter.locator('.scatter__legend')).toContainText('expected for this age')
  // One set of highlighted children in every view, in the same order.
  const expected = ['Ena', 'Benjamin', 'Hana']
  await expect(page.locator('.recommend .second__name')).toHaveText(expected)
  await expect(scatter.locator('.scatter__name')).toHaveText(expected)
  await expect(page.locator('.print-report__second')).toHaveText(/^Ena \(.*\), Benjamin \(.*\), Hana \(.*\)$/)
  for (const name of expected) {
    await page.locator('.recommend .second-list').getByRole('button', { name: new RegExp(name) }).click()
    await expect(page.locator('.advice__title')).toHaveText('Take a second look')
    if (name === 'Ena') {
      const cardAi = page.locator('.player-card .ai')
      await cardAi.getByRole('button', { name: /Explain \(AI\)/ }).click()
      await expect(cardAi.locator('.ai__badge')).toHaveText('Explanation without AI')
      await expect(cardAi.locator('.ai__result')).toContainText('6 months younger than the squad average. Rank on raw score: 16 of 20.')
    }
    await page.keyboard.press('Escape')
  }
  // With 8 places the children right below the line are borderline, and every view follows.
  await page.getByRole('button', { name: 'One place fewer' }).click()
  await page.getByRole('button', { name: 'One place fewer' }).click()
  await expect(page.locator('#recommend-title')).toHaveText('Widen the group by 4 places: 1 late-born talent + 3 borderline')
  await expect(page.locator('.recommend .second__name')).toHaveText(['Ena', 'Benjamin', 'Hana', 'Asja'])
  await expect(scatter.locator('.scatter__name')).toHaveText(['Ena', 'Benjamin', 'Hana', 'Asja'])
  await expect(page.locator('.recommend')).toContainText('Borderline: the children right below the line')
  await page.getByRole('button', { name: 'One place more' }).click()
  await page.getByRole('button', { name: 'One place more' }).click()
  await expect(page.locator('#recommend-title')).toHaveText('Widen the group by 3 places: 3 late-born talents')

  // The full ranking is collapsed until asked for.
  await expect(page.locator('.squad-table')).toBeHidden()
  await page.getByText('Show all players (20)').click()
  await expect(page.locator('.squad-table')).toBeVisible()

  // Asja gains rank but is not on the list, so nothing calls her a hidden talent.
  await page.locator('.squad-table').getByRole('button', { name: /Asja/ }).click()
  await expect(page.locator('.advice__title')).not.toHaveText('Take a second look')
  await page.keyboard.press('Escape')
  await expect(scatter.getByRole('img')).toHaveAccessibleDescription(/are above the line/)

  // Switching to the age-adjusted view changes who is selected.
  await page.getByRole('button', { name: 'Age-adjusted' }).click()
  await expect(page.getByRole('button', { name: 'Age-adjusted' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.squad-table tr.is-gained').first()).toBeVisible()

  // Player card opens with a suggested next step.
  await page.locator('.squad-table tr.is-gained').first().getByRole('button').click()
  await expect(page.getByText('Suggested next step')).toBeVisible()
  await page.keyboard.press('Escape')

  // Privacy page is linked from the footer and has its own address.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/#privacy$/)
  await expect(page.getByRole('heading', { name: 'How to delete your data' })).toBeVisible()
  await page.getByRole('button', { name: 'Bosanski' }).click()
  await expect(page.getByRole('heading', { name: 'Privatnost' })).toBeVisible()

  expect(errors).toEqual([])
})

test('phone: compact stepper, no horizontal scroll on any step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('./')
  const noOverflow = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.locator('.hero__number')).toContainText('32')
  await expect(page.locator('.stepper__compact')).toContainText('Korak 1 od 3')
  await noOverflow()
  await page.getByRole('link', { name: /Sljedeći korak/ }).click()
  await expect(page.locator('.stepper__compact')).toContainText('Korak 2 od 3')
  await page.getByRole('button', { name: /primjer/i }).click()
  await noOverflow()
  await page.getByRole('link', { name: /Sljedeći korak/ }).click()
  await expect(page.locator('.stepper__compact')).toContainText('Korak 3 od 3')
  await expect(page.locator('.squad-table tbody tr')).toHaveCount(20)
  await noOverflow()
  // The decision fits in a short page: no long scroll on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(2500)
  // The Monday actions are one line each; the detail opens on tap.
  const first = page.locator('.monday__item').first()
  await expect(first.locator('p')).toBeHidden()
  await first.locator('summary').click()
  await expect(first.locator('p')).toBeVisible()
})

test('small uploaded squad: the adjustment is flagged as a rough guide only', async ({ page }) => {
  await page.goto('./#squad')
  await page.getByRole('button', { name: 'English' }).click()
  const csv = 'name,birth_date,score\nA,2014-01-10,70\nB,2014-03-02,64\nC,2014-06-20,71\nD,2014-09-05,60\nE,2014-11-30,66\n'
  await page.locator('input[type="file"]').setInputFiles({ name: 'squad.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: /See the decision/ }).click()
  await expect(page.locator('.recommend')).toContainText('age does not reliably affect the score')
  await expect(page.locator('.synthetic')).toHaveCount(0)
})

test('lower-is-better test: the fastest child ranks first and the chart flips', async ({ page }) => {
  await page.goto('./#squad')
  await page.getByRole('button', { name: 'English' }).click()
  const csv = ['name,birth_date,score']
  // Twelve sprint times in seconds: older children are faster.
  for (let m = 1; m <= 12; m++) csv.push(`Kid${m},2014-${String(m).padStart(2, '0')}-15,${(8 + m * 0.1 + (m % 3) * 0.03).toFixed(2)}`)
  await page.locator('input[type="file"]').setInputFiles({ name: 'sprint.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.join('\n')) })
  await page.getByRole('button', { name: /Lower number \(time/ }).click()
  await expect(page.getByRole('button', { name: /Lower number \(time/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /See the decision/ }).click()
  await expect(page.locator('.squad-table tbody tr').first()).toContainText('Kid1')
  await expect(page.locator('.squad-table tbody tr').first()).toContainText('8.13')
  await expect(page.locator('.scatter__label').last()).toContainText('lower is better')
  await expect(page.locator('.trend-line')).toContainText('per month of age')
})

test('selection year from 1 September: badges and the squad chart follow the cut-off', async ({ page }) => {
  await page.goto('./#squad')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Try with the sample' }).click()
  await expect(page.getByText('14 of 20 players were born in the first half of the year.')).toBeVisible()
  await page.getByLabel('When does the age group start in your federation?').selectOption('9')
  await expect(page.getByText(/of 20 players were born in the older half of the age group \(Sep–Feb\)\./)).toBeVisible()
  await expect(page.locator('.chart__labels').first()).toContainText('Sep–Nov')
  await page.getByRole('button', { name: /See the decision/ }).click()
  await expect(page.locator('.squad-table')).toContainText('Jun–Aug')
  await expect(page.locator('.squad-table')).not.toContainText('Oct–Dec')
  await expect(page.locator('.scatter__legend')).toContainText('Sep–Nov · early-born')
})

for (const width of [390, 1366]) {
  test(`scatter names never overlap each other or leave the chart at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./#squad')
    await page.getByRole('button', { name: /primjer/i }).click()
    await page.goto('./#decision')
    const boxes = await page.locator('.scatter__name').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    const plot = await page.locator('figure.scatter svg[role="img"]').evaluate((e) => e.getBoundingClientRect().toJSON())
    expect(boxes.length).toBeGreaterThan(0)
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(plot.left)
      expect(boxes[i].right).toBeLessThanOrEqual(plot.right)
      for (let j = i + 1; j < boxes.length; j++) {
        const apart =
          boxes[i].right <= boxes[j].left || boxes[j].right <= boxes[i].left || boxes[i].bottom <= boxes[j].top || boxes[j].bottom <= boxes[i].top
        expect(apart, `${i} and ${j} overlap`).toBe(true)
      }
    }
  })
}

test('AI explanation (mocked proxy): marked as AI, and only anonymous numbers are sent', async ({ page }) => {
  const sent: Record<string, any>[] = []
  await page.route(`${AI_ORIGIN}/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' },
      })
      return
    }
    const body = JSON.parse(request.postData() ?? '{}')
    sent.push(body)
    // Slow enough for the loading state to be seen.
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ text: `Mocked explanation for a ${body.kind} request.`, model: 'mock' }),
    })
  })

  await page.goto('./#squad')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Try with the sample' }).click()
  await page.getByRole('button', { name: /See the decision/ }).click()

  // Nothing is sent before the coach asks.
  expect(sent).toEqual([])

  // Recommendation card: loading state, then AI text that is visibly marked as AI.
  const ai = page.locator('.recommend .ai')
  await ai.getByRole('button', { name: /Explain \(AI\)/ }).click()
  await expect(ai.getByRole('status')).toHaveText('AI is writing…')
  await expect(ai.locator('.ai__result--ai')).toContainText('Mocked explanation for a squad request.')
  await expect(ai.locator('.ai__badge')).toHaveText(/AI-generated/)
  await expect(ai).toContainText('The calculation makes the decision, not the AI.')
  // The recommendation itself did not change.
  await expect(page.locator('#recommend-title')).toHaveText('Widen the group by 3 places: 3 late-born talents')

  // Player card for the first second-look child.
  await page.locator('.recommend .second-list').getByRole('button', { name: /Ena/ }).click()
  const cardAi = page.locator('.player-card .ai')
  await cardAi.getByRole('button', { name: /Explain \(AI\)/ }).click()
  await expect(cardAi.locator('.ai__result--ai')).toContainText('Mocked explanation for a child request.')
  await expect(page.locator('.advice__title')).toHaveText('Take a second look')

  // What left the browser: two requests, numbers and fixed codes only.
  expect(sent.map((b) => b.kind)).toEqual(['squad', 'child'])
  expect(sent[1].child).toMatchObject({ rawRank: 16, adjustedRank: 7, lateBorn: true, secondLook: true, borderline: false })
  expect(sent[1].language).toBe('en')
  const names = ['Ena', 'Benjamin', 'Hana', 'Asja', 'Adnan', 'Lana', 'Emina', 'Haris', 'Tarik', 'Dino', 'Amar']
  for (const body of sent) {
    const text = JSON.stringify(body)
    for (const name of names) expect(text).not.toContain(name)
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/)
    expect(text).not.toMatch(/name|birth|date/i)
    // The only text values anywhere in the payload are the two fixed codes.
    const stringValues = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringValues) : []
    expect(stringValues(body).sort()).toEqual([body.kind, body.language].sort())
  }
})

test('odd data is explained to the coach, not silently used', async ({ page }) => {
  await page.goto('./#squad')
  await page.getByRole('button', { name: 'English' }).click()
  // Twelve children, younger ones score higher, two tied at the last of 6 places, one typo.
  const rows = ['name,birth_date,score']
  for (let m = 1; m <= 12; m++) rows.push(`Kid${m},2014-${String(m).padStart(2, '0')}-10,${m === 6 || m === 7 ? 70 : m === 3 ? 9999 : 50 + m * 3}`)
  await page.locator('input[type="file"]').setInputFiles({ name: 'odd.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n')) })
  await page.getByRole('button', { name: /See the decision/ }).click()
  const warnings = page.getByRole('note', { name: 'Check your data' })
  await expect(warnings).toContainText('1 score is far from all the others')
  // No recommendation to add anyone is made from a trend that is not dependable.
  await expect(page.locator('.recommend')).toContainText('age does not reliably affect the score')
  // The method note says how widely the analysis was tested.
  await page.getByText('How we calculate this').click()
  await expect(page.locator('details.how')).toContainText('Tested on 43 edge cases')
})

test('pitch deck: four slides, backup slide, keyboard, exit', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('./')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Prezentacija' }).click()
  await expect(page).toHaveURL(/#pitch$/)
  // Full screen: no stepper around the slides.
  await expect(page.getByRole('navigation', { name: 'Koraci' })).toHaveCount(0)

  const current = page.locator('.pitch__slide--current')
  const counter = page.locator('.pitch__counter')
  await expect(current).toContainText('Isto godište. Skoro godinu dana razlike.')
  await expect(current).toContainText('Ko bude izabran?')
  await expect(counter).toHaveText('1 / 4')

  await page.keyboard.press('ArrowRight')
  await expect(current).toContainText('32%')
  await expect(current).toContainText('18%')
  await expect(current).toContainText('1,8×')
  await expect(current).toContainText('Japan, gdje godište počinje u aprilu: 2,4×. Efekat prati datum presjeka, ne mjesec.')
  await expect(current).toContainText('n = 5.538 · p ≈ 10⁻⁵⁰ · Izvor: Transfermarkt')

  await page.keyboard.press('Space')
  await expect(current).toContainText('Late Bloomers — besplatan alat za trenera')
  await expect(current.getByRole('link', { name: /Demo uživo/ })).toHaveAttribute('href', '#problem')

  await current.click({ position: { x: 20, y: 20 } })
  await expect(counter).toHaveText('4 / 4')
  await expect(current).toContainText('Talenat ne smije zavisiti od mjeseca rođenja.')
  await expect(current).toContainText('43 rubna slučaja')
  await expect(current).toContainText('ProdReady 93 / A')
  await expect(current).toContainText('berbicanes.github.io/hackathon/')
  const qr = current.getByRole('img', { name: /QR kod/ })
  await expect(qr).toBeVisible()
  expect(await qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // The main sequence ends at slide 4; the backup slide is reached only on purpose.
  await page.keyboard.press('ArrowRight')
  await expect(counter).toHaveText('4 / 4')
  await page.keyboard.press('b')
  await expect(current).toContainText('Matematika odlučuje, AI objašnjava.')
  await expect(current.locator('.scatter__dot').first()).toBeVisible()
  await expect(counter).toHaveText('Rezerva')
  await page.keyboard.press('b')
  await expect(counter).toHaveText('4 / 4')

  // English through the language switch, back with the arrow, slides fit the screen.
  await page.getByRole('button', { name: 'English' }).click()
  await expect(current).toContainText('Talent must not depend on the month you were born.')
  await page.keyboard.press('ArrowLeft')
  await expect(current.getByRole('link', { name: /Live demo/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#problem$/)
  await expect(page.getByRole('navigation', { name: 'Steps' })).toBeVisible()
})
