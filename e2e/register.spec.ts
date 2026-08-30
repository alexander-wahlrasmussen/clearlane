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

/** Grain toggle and column picker — the register serves both grains. */
test('register switches grain and columns', async ({ page }) => {
  await page.goto('/mvp');
  await expect(page.getByRole('heading', { name: 'Declarations' })).toBeVisible();
  await expect(page.getByText(/\d+ declarations/).first()).toBeVisible();

  // Declaration grain has no goods-line columns.
  await expect(page.getByRole('columnheader', { name: 'Commodity code' })).toHaveCount(0);

  // Switch to goods lines: more rows than declarations, line columns appear.
  await page.getByRole('button', { name: 'Goods lines' }).click();
  await expect(page.getByText(/\d+ goods lines/).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Commodity code' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();

  // The column picker adds a field, and it reaches the table.
  await page.getByRole('button', { name: /^Columns \(/ }).click();
  await expect(page.getByText('Columns shown')).toBeVisible();
  await page.getByRole('checkbox', { name: /Net mass/ }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Columns shown')).toBeHidden();
  await expect(page.getByRole('columnheader', { name: 'Net kg' })).toBeVisible();

  // Back to declarations: line columns are gone again.
  await page.getByRole('button', { name: 'Declarations', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Commodity code' })).toHaveCount(0);
});
