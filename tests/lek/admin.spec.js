const { test, expect, ensureOnPage } = require('../testlab');

test('Admin: admin-side åpnes', async ({ page }, testInfo) => {
  await ensureOnPage(page, testInfo, '/admin');

  const heading = page
    .getByRole('heading', { name: /admin/i })
    .or(page.locator('text=/admin/i').first())
    .first();

  if (await heading.isVisible().catch(() => false)) {
    await expect(heading).toBeVisible();
    return;
  }

  const forbidden = page.locator('text=/forbudt|ingen tilgang|ikke tilgang|unauthorized|forbidden|403/i').first();
  if (await forbidden.isVisible().catch(() => false)) {
    testInfo.annotations.push({ type: 'warning', description: 'Admin er beskyttet for denne brukeren (forventet i staging for ikke-admin)' });
    await expect(forbidden).toBeVisible();
    return;
  }

  await expect(heading, 'Admin-side lastet uten tydelig "Admin" overskrift eller "ingen tilgang" melding').toBeVisible();
});
