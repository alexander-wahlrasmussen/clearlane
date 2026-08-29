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

  // Hand the evidence set off to the Declarations tab.
  await page.getByRole('button', { name: /Open these in the Declarations tab/ }).click();
  await expect(page.getByText(/From answer:/)).toBeVisible();
});
