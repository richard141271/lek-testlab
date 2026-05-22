const { test, expect, requireBaseUrl, gotoAndMeasure } = require('./testlab');

test('Scanner: scanner-side åpnes og scanner-knapp finnes', async ({ page }, testInfo) => {
  requireBaseUrl(testInfo);

  const base = process.env.BASE_URL;
  const url = new URL('/scanner', base).toString();
  await gotoAndMeasure(page, testInfo, url);

  const scannerButton = page
    .getByRole('button', { name: /scan|skann|start/i })
    .or(page.locator('[data-testid*="scan"]'))
    .or(page.locator('[data-testid*="scanner"]'))
    .first();

  await expect(scannerButton).toBeVisible();
});
