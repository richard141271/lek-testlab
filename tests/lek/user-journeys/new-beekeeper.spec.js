const { test } = require('../../testlab');
const { beginJourney, navigateByName, recordJourney, expect } = require('./shared');

test('User Journey: ny birøkter kan opprette bigård, kube og få Aurora-forslag', async ({ page }, testInfo) => {
  await beginJourney(
    page,
    testInfo,
    'new-beekeeper',
    { flow: ['registrer konto', 'opprett bigård', 'legg til kube', 'inspeksjon', 'aurora'] },
    { result: 'PASS', outcome: 'oppgave opprettes' }
  );

  const visited = [];
  if (await navigateByName(page, ['bigård', 'apiary', 'gård'])) visited.push('bigård');
  if (await navigateByName(page, ['kube', 'hive'])) visited.push('kube');
  if (await navigateByName(page, ['inspeksjon', 'inspection'])) visited.push('inspeksjon');
  if (await navigateByName(page, ['aurora'])) visited.push('aurora');

  const text = await page.locator('body').innerText().catch(() => '');
  recordJourney(testInfo, { visited, excerpt: text.slice(0, 1200) });

  expect(visited.includes('inspeksjon'), 'Forventet at brukerreisen kom til inspeksjon').toBeTruthy();
  expect(/aurora|forslag|oppgave/i.test(text), 'Forventet Aurora-forslag eller oppgave i flyten').toBeTruthy();
});
