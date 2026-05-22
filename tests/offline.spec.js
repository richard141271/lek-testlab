const { test, expect, ensureOnPage, loginIfNeeded } = require('./testlab');

test('Offline: app kan åpnes offline og cache fungerer', async ({ page }, testInfo) => {
  await ensureOnPage(page, testInfo, '/dashboard');

  await page.waitForFunction(() => 'serviceWorker' in navigator, null, { timeout: 10_000 }).catch(() => {});
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.ready;
    } catch {}
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await loginIfNeeded(page, testInfo);
  await page
    .waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 10_000 })
    .catch(() => {});

  const ctx = page.context();
  await ctx.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
  } finally {
    await ctx.setOffline(false);
  }

  const text = await page.locator('body').innerText().catch(() => '');
  expect(text && text.length > 20, 'Offline reload ga tom side (mulig manglende cache/service worker)').toBeTruthy();
});
