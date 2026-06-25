const { test, expect } = require('../../testlab');
const { evaluateBiology, responseText } = require('./shared');

test('Biologi: egg kan ikke være normale når egg ikke er observert', async ({ page }, testInfo) => {
  const payload = {
    eggs_seen: false,
    egg_amount: 'normal'
  };
  const json = await evaluateBiology(page, testInfo, payload, {
    result: 'FAIL',
    biologicalRules: ['eggs-consistency']
  });
  const text = responseText(json);
  expect(/fail|conflict|konflikt|ugyldig/i.test(text), 'Forventet biologisk konflikt/FAIL').toBeTruthy();
  expect(/egg/i.test(text), 'Forventet omtale av egg-regel').toBeTruthy();
});
