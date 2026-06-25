const { test, expect } = require('../../testlab');
const { evaluateBiology, responseText } = require('./shared');

test('Biologi: lite mat på høst skal gi høy prioritet', async ({ page }, testInfo) => {
  const payload = {
    food_status: 'lite',
    season: 'host'
  };
  const json = await evaluateBiology(page, testInfo, payload, {
    result: 'PASS',
    biologicalRules: ['autumn-feeding-high-priority']
  });
  const text = responseText(json);
  expect(/high|høy|priority|prioritet/i.test(text), 'Forventet høy prioritet').toBeTruthy();
  expect(/f[oô]r|mat|feeding/i.test(text), 'Forventet omtale av fôring').toBeTruthy();
});
