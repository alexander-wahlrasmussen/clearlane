import { expect, test } from '@playwright/test';

/** Critical flow 2: ask a question → evidence-backed answer → drill down. */
test('ask surface answers with evidence', async ({ page }) => {
  await page.goto('/ai');
  await expect(page.getByLabel('Ask about your customs data')).toBeVisible();

  await page.getByLabel('Ask about your customs data').fill('How much duty did we pay in Germany since June?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();

  // The answer states its interpretation and that it was computed, not estimated.
  await expect(page.getByText('Understood as')).toBeVisible();
  await expect(page.getByText('✓ Computed from source data')).toBeVisible();

  // Every answer links to the exact underlying declarations.
  await page.getByRole('button', { name: /View underlying declarations/ }).click();
  await expect(page.getByText(/declarations were used to compute this answer/)).toBeVisible();

  // Hand the evidence set off to the Declarations tab — the full register, filtered to it.
  await page.getByRole('button', { name: /Open these in the Declarations tab/ }).click();
  await expect(page.getByText(/From answer:/)).toBeVisible();
  await expect(page.getByText('Data scope')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Columns \(/ })).toBeVisible();
});

/** A report is a question whose interpretation is already known: the same rows, columns and export. */
test('reports are asked for, and open as extract answers', async ({ page }) => {
  await page.goto('/ai');
  await page.getByRole('button', { name: 'Declaration Line Overview' }).click();

  const answer = page.locator('[class*="answerCard"]').first();
  await expect(answer.getByText('✓ Rows from source data')).toBeVisible();
  await expect(answer.getByRole('columnheader', { name: 'Commodity code' })).toBeVisible();
  await expect(answer.getByText(/Showing 1–\d+ of \d+ goods lines/)).toBeVisible();

  // A row is the evidence: it opens the full declaration, all six tabs.
  await answer.locator('tbody tr').first().click();
  const drawer = page.getByRole('dialog', { name: /^Declaration / });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('tab', { name: 'Data availability and freshness' })).toBeVisible();
  await drawer.getByTitle('Close').click();

  // The export is the register's export: the file states its rows and columns first.
  await answer.getByRole('button', { name: 'Export rows…' }).click();
  await expect(page.getByRole('dialog', { name: 'Export goods lines' })).toBeVisible();
  await expect(page.getByText(/one row per goods line/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

/** A report the data cannot produce gets the reason, not an approximation. */
test('a report the data cannot support is refused with the reason', async ({ page }) => {
  await page.goto('/ai');
  await page.getByLabel('Ask about your customs data').fill('VAT report for Q2');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText('Cannot be produced from declaration data')).toBeVisible();
  await expect(page.getByText(/VAT registration number/)).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Add to report' })).toBeDisabled();
});
