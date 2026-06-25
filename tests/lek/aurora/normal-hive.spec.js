const { test, expect } = require('../../testlab');
const { runAuroraScenario, assertAuroraOutcome } = require('./shared');

test('Aurora: normal kube gir rolig oppsummering uten advarsler eller oppgaver', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      queen_seen: true,
      eggs_seen: true,
      food_status: 'middels',
      temperament: 'rolig'
    },
    expected: {
      summary: 'Kort positiv oppsummering',
      noWarnings: true,
      noTasks: true,
      noDuplicates: true
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  assertAuroraOutcome(result, {
    excludes: [
      { regex: /advarsel|warning|kritisk|panic/i, message: 'Normal kube skal ikke gi advarsel eller panikk' },
      { regex: /duplikat|duplicate/i, message: 'Normal kube skal ikke gi duplikatmelding' }
    ],
    maxTasks: 0
  });
  expect(/bra|ser bra ut|rolig|stabil|normal/i.test(result.text), 'Forventet en positiv kort oppsummering').toBeTruthy();
});
