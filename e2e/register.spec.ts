import { expect, test } from '@playwright/test';

/** Critical flow 1: register → filter → declaration detail → tabs. */
test('register filters and declaration detail', async ({ page }) => {
  await page.goto('/mvp');
  await expect(page.getByRole('heading', { name: 'Declarations' })).toBeVisible();

  // Data scope is always visible.
  await expect(page.getByText('Data scope')).toBeVisible();

  // Filter to Germany.
  await page.getByLabel('Declaration country').selectOption({ label: 'Germany' });
  await expect(page.getByText('Country: Germany')).toBeVisible();

  // Open the first declaration.
  const firstRow = page.locator('tbody tr').first();
  await firstRow.click();
  await expect(page.getByText('Back to declarations')).toBeVisible();

  // Six tabs, goods lines expandable, availability reachable.
  await page.getByRole('tab', { name: /Goods lines/ }).click();
  await expect(page.getByText('Field states:')).toBeVisible();
  await page.getByRole('tab', { name: 'Values, duties and taxes' }).click();
  await expect(page.getByText(/Reconciled|Difference found/)).toBeVisible();
  await page.getByRole('tab', { name: 'Data availability and freshness' }).click();
  await expect(page.getByText('Availability and freshness', { exact: true })).toBeVisible();
});
