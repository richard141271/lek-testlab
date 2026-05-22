const { test, expect, requireBaseUrl, gotoAndMeasure } = require('./testlab');

test('Login: åpne LEK, logg inn, bekreft dashboard lastet', async ({ page }, testInfo) => {
  requireBaseUrl(testInfo);

  const base = process.env.BASE_URL;
  const url = new URL('/login', base).toString();
  await gotoAndMeasure(page, testInfo, url);

  const maybeDashboard = page.locator('text=/dashboard/i').first();
  if (await maybeDashboard.isVisible().catch(() => false)) {
    await expect(maybeDashboard).toBeVisible();
    return;
  }

  const emailValue = process.env.LEK_EMAIL || '';
  const passwordValue = process.env.LEK_PASSWORD || '';

  const email = page
    .getByLabel(/e-?post|email/i)
    .or(page.getByPlaceholder(/e-?post|email/i))
    .first();
  const password = page
    .getByLabel(/passord|password/i)
    .or(page.getByPlaceholder(/passord|password/i))
    .first();

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  if (emailValue) await email.fill(emailValue);
  if (passwordValue) await password.fill(passwordValue);

  const submit = page
    .getByRole('button', { name: /logg inn|login|sign in/i })
    .or(page.getByRole('button', { name: /fortsett|continue/i }))
    .first();

  await expect(submit).toBeVisible();
  await submit.click();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);

  const dashboardSignal = page
    .getByRole('heading', { name: /dashboard/i })
    .or(page.locator('[data-testid="dashboard"]'))
    .or(page.locator('text=/dashboard/i').first())
    .first();

  await expect(dashboardSignal).toBeVisible();
});
