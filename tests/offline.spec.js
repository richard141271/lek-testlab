const { test, expect, requireBaseUrl, gotoAndMeasure } = require('./testlab');

test('Offline: app kan åpnes offline og cache fungerer', async ({ page }, testInfo) => {
  requireBaseUrl(testInfo);

  const base = process.env.BASE_URL;
  const url = new URL('/dashboard', base).toString();
  await gotoAndMeasure(page, testInfo, url);

  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.ready;
    } catch {}
  });

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
