const { test, expect, ensureOnPage } = require('../testlab');

test('Dashboard: dashboard lastes og viktige kort finnes', async ({ page }, testInfo) => {
  await ensureOnPage(page, testInfo, '/dashboard');

  const heading = page.getByRole('heading', { name: /dashboard/i }).first();
  await expect(heading).toBeVisible();

  const cards = [
    page.locator('[data-testid*="card"]').first(),
    page.locator('.card').first(),
    page.locator('text=/scanner/i').first(),
    page.locator('text=/offline/i').first(),
    page.locator('text=/feedback/i').first()
  ];

  let found = false;
  for (const c of cards) {
    if (await c.isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }

  expect(found, 'Fant ingen tydelige "kort" eller kjerne-seksjoner på dashboardet').toBeTruthy();
});
