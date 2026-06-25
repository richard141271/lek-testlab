const { test } = require('../../testlab');
const { beginJourney, navigateByName, recordJourney, expect } = require('./shared');

test('User Journey: Aurora oppfølging kan åpnes fra tidligere forslag', async ({ page }, testInfo) => {
  await beginJourney(
    page,
    testInfo,
    'aurora-followup',
    { flow: ['dashboard', 'aurora', 'oppfølging'] },
    { result: 'PASS', outcome: 'oppfølging åpnes' }
  );

  await navigateByName(page, ['aurora']);
  const opened = await navigateByName(page, ['oppfølging', 'follow up', 'oppgave']);
  const text = await page.locator('body').innerText().catch(() => '');
  recordJourney(testInfo, { opened, excerpt: text.slice(0, 1200) });

  expect(opened, 'Forventet å kunne åpne oppfølging fra Aurora').toBeTruthy();
  expect(/oppf[oø]lging|kontroll|task|oppgave/i.test(text), 'Forventet oppfølgingsvisning').toBeTruthy();
});
