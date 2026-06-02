const { test, expect, ensureOnPage } = require('../testlab');

test('Scanner: scanner-side åpnes og scanner-knapp finnes', async ({ page }, testInfo) => {
  await ensureOnPage(page, testInfo, '/scanner');

  const scannerButton = page
    .getByRole('button', { name: /scan|skann|start/i })
    .or(page.locator('[data-testid*="scan"]'))
    .or(page.locator('[data-testid*="scanner"]'))
    .first();

  await expect(scannerButton).toBeVisible();
});
