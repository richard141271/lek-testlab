const { test } = require('../../testlab');
const { beginJourney, navigateByName, recordJourney, expect } = require('./shared');

test('User Journey: første inspeksjon kan fullføres med oppsummering', async ({ page }, testInfo) => {
  await beginJourney(
    page,
    testInfo,
    'first-inspection',
    { flow: ['dashboard', 'inspeksjon', 'lagre'] },
    { result: 'PASS', outcome: 'oppsummering vises' }
  );

  await navigateByName(page, ['inspeksjon', 'inspection', 'ny inspeksjon']);
  const action = await navigateByName(page, ['lagre', 'fortsett', 'send', 'analyser']);
  const text = await page.locator('body').innerText().catch(() => '');
  recordJourney(testInfo, { submitted: action, excerpt: text.slice(0, 1200) });

  expect(action, 'Forventet å kunne fortsette eller lagre inspeksjon').toBeTruthy();
  expect(/oppsummering|summary|aurora|forslag/i.test(text), 'Forventet oppsummering eller Aurora-resultat').toBeTruthy();
});
