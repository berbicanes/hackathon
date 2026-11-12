import { expect, test } from '@playwright/test'

test('coach journey: evidence, sample squad, fair selection, player card', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Late Bloomers')
  await expect(page.locator('html')).toHaveAttribute('lang', 'bs')

  // Bias mirror loads the analysis and shows the headline share.
  await expect(page.locator('.hero__number')).toContainText('32')

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
  await expect(page.locator('.hero__sub')).toContainText('as common as Q4-born among under-21 pros')

  // Cut-off robustness check is shown with England measured from 1 September.
  const cutoff = page.locator('section[aria-labelledby="cutoff-title"]')
  await expect(cutoff.getByRole('row', { name: /England under 21, own cut-off/ })).toContainText('1 Sep')
  await expect(cutoff.locator('tbody tr')).toHaveCount(8)

  // Your squad with the synthetic sample.
  await page.getByRole('button', { name: 'Your squad', exact: true }).click()
  await page.getByRole('button', { name: 'Load synthetic sample' }).click()
  await expect(page.locator('.synthetic')).toContainText('SYNTHETIC SAMPLE')
  await expect(page.locator('.squad-table tbody tr')).toHaveCount(20)

  // Switching to the age-adjusted view changes who is selected.
  await page.getByRole('button', { name: 'Age-adjusted' }).click()
  await expect(page.getByRole('button', { name: 'Age-adjusted' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.squad-table tr.is-gained').first()).toBeVisible()

  // Player card opens with a suggested next step.
  await page.locator('.squad-table tr.is-gained').first().getByRole('button').click()
  await expect(page.getByText('Suggested next step')).toBeVisible()

  await page.keyboard.press('Escape')

  // In Bosnian the assessment date always reads dd.mm.yyyy, whatever the browser locale.
  await page.getByRole('button', { name: 'Bosanski' }).click()
  const date = page.getByLabel(/Datum testiranja/)
  await expect(date).toHaveValue(/^\d{2}\.\d{2}\.\d{4}$/)
  await date.fill('31.02.2026')
  await expect(date).toHaveAttribute('aria-invalid', 'true')
  await date.fill('15.03.2026')
  await expect(date).toHaveAttribute('aria-invalid', 'false')
  await date.blur()
  await expect(date).toHaveValue('15.03.2026')
  await page.getByRole('button', { name: 'English' }).click()

  // Privacy page is linked from the footer and has its own address.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/#privacy$/)
  await expect(page.getByRole('heading', { name: 'How to delete your data' })).toBeVisible()
  await page.getByRole('button', { name: 'Bosanski' }).click()
  await expect(page.getByRole('heading', { name: 'Privatnost' })).toBeVisible()

  expect(errors).toEqual([])
})
