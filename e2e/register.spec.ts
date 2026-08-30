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

/** Reports are saved views: open one, adjust it, save your own, export what is on screen. */
test('reports open the register configured, and export follows the view', async ({ page }) => {
  await page.goto('/mvp/reports');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page.getByText('Declaration Line Overview')).toBeVisible();
  // The reports the data cannot produce are named, with the reason.
  await expect(page.getByText('Requested reports not offered here')).toBeVisible();
  await expect(page.getByText('Intrastat', { exact: true })).toBeVisible();

  // Open the line-grain report: goods-line rows and its columns.
  await page.getByRole('row', { name: /Declaration Line Overview/ }).getByRole('link', { name: 'Open report' }).click();
  await expect(page).toHaveURL(/view=declaration-line-overview/);
  await expect(page.getByText(/\d+ goods lines/).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Commodity code' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Net kg' })).toBeVisible();
  await expect(page.getByLabel('Report')).toHaveValue('declaration-line-overview');

  // Adjust it: the report is marked modified; a built-in one can only be saved as new.
  await page.getByLabel('Declaration country').selectOption({ label: 'Germany' });
  await expect(page.getByText('Modified')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save as new report…' }).click();
  await page.getByLabel('Report name').fill('German goods lines');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Report')).toHaveValue(/^view-/);
  await expect(page.getByText('Modified')).toHaveCount(0);
  await expect(page.getByText('Your report.')).toBeVisible();

  // Export states the grain and the visible columns, and the file is named after the report.
  await page.getByRole('button', { name: 'Export results' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export goods lines' });
  await expect(dialog.getByText('German goods lines')).toBeVisible();
  await expect(dialog.getByText(/one row per goods line/)).toBeVisible();
  await expect(dialog.getByText(/Commodity code, Description, Country of origin/)).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('german-goods-lines.csv');

  // The saved report survives a reload and is listed on the Reports page.
  await page.reload();
  await expect(page.getByLabel('Report')).toHaveValue(/^view-/);
  await expect(page.getByRole('columnheader', { name: 'Commodity code' })).toBeVisible();
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('row', { name: /German goods lines/ })).toContainText('Germany');

  // Delete it from the register.
  await page.getByRole('row', { name: /German goods lines/ }).getByRole('link', { name: 'Open report' }).click();
  await page.getByRole('button', { name: 'Delete report' }).click();
  await expect(page.getByLabel('Report')).toHaveValue('');
  await expect(page).not.toHaveURL(/view=/);
});

/** The front door: what this is, and the switch between the two surfaces. */
test('landing page explains the prototype and the surfaces switch both ways', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /One place for a customer/ })).toBeVisible();
  await expect(page.getByText('Everything here is synthetic.')).toBeVisible();
  await expect(page.getByText(/^Build [0-9a-f]{7}/)).toBeVisible();

  await page.getByRole('link', { name: /Open the MVP/ }).click();
  await expect(page.getByRole('heading', { name: 'Declarations' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('Synthetic data');

  await page.getByRole('navigation', { name: 'Product surface' }).getByRole('link', { name: 'AI concept' }).click();
  await expect(page).toHaveURL(/\/ai$/);
  await page.getByRole('navigation', { name: 'Product surface' }).getByRole('link', { name: 'MVP' }).click();
  await expect(page).toHaveURL(/\/mvp$/);
  await page.getByRole('link', { name: 'About this prototype' }).click();
  await expect(page.getByText('Everything here is synthetic.')).toBeVisible();
});
