const { test, expect } = require('../../testlab');
const { runAuroraScenario } = require('./shared');

test('Aurora: sverming gir tydelig oppfølging uten duplikate tiltak', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      notes: 'Tegn til sverming med mange dronningceller.'
    },
    expected: {
      biologicalRules: ['swarming-followup']
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  expect(/sverm|sverming/i.test(result.text), 'Forventet sverming i oppsummering').toBeTruthy();
  expect(/dronningcelle|oppf[oø]lging|tiltak/i.test(result.text), 'Forventet konkrete tiltak ved sverming').toBeTruthy();
  expect(/duplikat|duplicate/i.test(result.text), 'Skal ikke gi duplikatmelding').toBeFalsy();
});
