const { test, expect } = require('../../testlab');
const { evaluateBiology, responseText } = require('./shared');

test('Biologi: sverming skal gi konsistente tiltak og oppfølging', async ({ page }, testInfo) => {
  const payload = {
    notes: 'Mange dronningceller og tegn på sverming'
  };
  const json = await evaluateBiology(page, testInfo, payload, {
    result: 'PASS',
    biologicalRules: ['swarming-followup']
  });
  const text = responseText(json);
  expect(/sverm|swarm/i.test(text), 'Forventet omtale av sverming').toBeTruthy();
  expect(/oppf[oø]lging|tiltak|splitte|avlegger/i.test(text), 'Forventet konkrete tiltak').toBeTruthy();
});
