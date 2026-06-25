const { test } = require('../../testlab');
const { beginJourney, navigateByName, recordJourney, expect, loginIfNeeded } = require('./shared');

test('User Journey: offline lagring synker når nett kommer tilbake', async ({ page }, testInfo) => {
  await beginJourney(
    page,
    testInfo,
    'offline-sync',
    { flow: ['dashboard', 'offline', 'synk'] },
    { result: 'PASS', outcome: 'automatisk synk' }
  );

  const context = page.context();
  await context.setOffline(true);
  try {
    await navigateByName(page, ['inspeksjon', 'inspection', 'ny inspeksjon']);
    await navigateByName(page, ['lagre', 'fortsett', 'send']);
  } finally {
    await context.setOffline(false);
  }

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await loginIfNeeded(page, testInfo);
  const text = await page.locator('body').innerText().catch(() => '');
  recordJourney(testInfo, { excerpt: text.slice(0, 1200) });

  expect(/synk|sync|opplastet|lastet opp/i.test(text), 'Forventet melding om synk etter at nett kom tilbake').toBeTruthy();
});
