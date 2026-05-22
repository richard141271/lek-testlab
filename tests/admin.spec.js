const { test, expect, requireBaseUrl, gotoAndMeasure } = require('./testlab');

test('Admin: admin-side åpnes', async ({ page }, testInfo) => {
  requireBaseUrl(testInfo);

  const base = process.env.BASE_URL;
  const url = new URL('/admin', base).toString();
  await gotoAndMeasure(page, testInfo, url);

  const heading = page
    .getByRole('heading', { name: /admin/i })
    .or(page.locator('text=/admin/i').first())
    .first();

  await expect(heading).toBeVisible();
});
