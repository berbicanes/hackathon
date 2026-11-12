import { expect, test } from '@playwright/test'

test('coach journey: evidence, sample squad, fair selection, player card', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Content-Security-Policy violations are reported on the console.
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  // The page must not call any third party (fonts are self-hosted).
  const origin = new URL(test.info().project.use.baseURL!).origin
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.protocol.startsWith('http') && url.origin !== origin) errors.push(`third-party request: ${r.url()}`)
  })

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
  await expect(page.locator('#recommend-title')).toHaveText('Widen the group by 3 places so you do not lose late-born talent.')
  await expect(page.locator('.recommend')).toContainText('Second look — reassess in 6 months')
  await expect(page.locator('.squad-table tr.is-second')).toHaveCount(3)
  await expect(page.locator('.squad-table tr.is-lost')).toHaveCount(0)
  await expect(page.locator('.squad-table')).not.toContainText('Drops out')

  await expect(page.locator('.trend-line')).toHaveText(/^≈ 2\.2 points per month of age, range \d\.\d–\d\.\d\.$/)

  // "How it works": one dot per child, the trend line, hidden talents named.
  const scatter = page.locator('figure.scatter')
  await expect(scatter.locator('.scatter__dot')).toHaveCount(20 + 4)
  await expect(scatter.locator('.scatter__legend')).toContainText('expected for this age')
  await expect(scatter.locator('.scatter__name').first()).toHaveText('Ena')
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
