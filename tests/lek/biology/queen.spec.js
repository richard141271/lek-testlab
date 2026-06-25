const { test, expect } = require('../../testlab');
const { evaluateBiology, responseText } = require('./shared');

test('Biologi: dronning kan være oversett når egg er observert', async ({ page }, testInfo) => {
  const payload = {
    queen_seen: false,
    eggs_seen: true
  };
  const json = await evaluateBiology(page, testInfo, payload, {
    result: 'PASS',
    biologicalRules: ['queen-may-be-missed']
  });
  const text = responseText(json);
  expect(/pass|ok|oversett|reinspect|ny inspeksjon|ny kontroll/i.test(text), 'Forventet PASS med ny inspeksjon anbefalt').toBeTruthy();
});
