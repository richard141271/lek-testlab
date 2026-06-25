const { test, expect } = require('../../testlab');
const { setAiHints, setQaContext, mergeActual, annotateSuite } = require('../helpers');
const { evaluateBiology } = require('../biology/shared');

test('Regression: issue-002 queen/eggs-konflikt håndteres biologisk riktig', async ({ page }, testInfo) => {
  annotateSuite(testInfo, 'regression');
  const payload = { queen_seen: false, eggs_seen: true };
  setQaContext(testInfo, {
    input: payload,
    expected: { status: 'PASS', message: 'Dronning kan være oversett' },
    biologicalRules: ['queen-may-be-missed']
  });
  setAiHints(testInfo, {
    likelyFiles: ['aurora.ts', 'biology-rules.ts'],
    possibleCauses: ['Manglende biologisk regel', 'For aggressiv konfliktvalidering'],
    recommendedChecks: ['Verifiser queen/eggs-regelen', 'Kontroller fallback når egg er observert']
  });

  const json = await evaluateBiology(page, testInfo, payload, {
    result: 'PASS',
    biologicalRules: ['queen-may-be-missed']
  });
  const actual = JSON.stringify(json);
  mergeActual(testInfo, { response: json, text: actual });

  expect(/pass|oversett|ny inspeksjon|ny kontroll/i.test(actual), 'Bug issue-002 er tilbake: queen/eggs blir tolket som hard konflikt').toBeTruthy();
});
