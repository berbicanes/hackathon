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

  expect(errors).toEqual([])
})
