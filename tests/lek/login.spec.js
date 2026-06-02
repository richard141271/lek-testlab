const { test, expect, openPath, loginIfNeeded } = require('../testlab');

test('Login: åpne LEK, logg inn, bekreft dashboard lastet', async ({ page }, testInfo) => {
  await openPath(page, testInfo, '/login');

  const maybeDashboard = page.locator('text=/dashboard/i').first();
  if (await maybeDashboard.isVisible().catch(() => false)) {
    await expect(maybeDashboard).toBeVisible();
    return;
  }
  await loginIfNeeded(page, testInfo);

  const dashboardSignal = page
    .getByRole('heading', { name: /dashboard/i })
    .or(page.locator('[data-testid="dashboard"]'))
    .or(page.locator('text=/dashboard/i').first())
    .first();

  await expect(dashboardSignal).toBeVisible();
});
