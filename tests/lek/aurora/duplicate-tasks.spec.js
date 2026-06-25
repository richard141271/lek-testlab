const { test, expect } = require('../../testlab');
const { runAuroraScenario } = require('./shared');

test('Aurora: samme problem skal ikke generere duplikate oppgaver', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      food_status: 'lite',
      notes: 'Lite mat og lite mat observert flere ganger.'
    },
    expected: {
      noDuplicates: true
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  expect(/duplikat|duplicate/i.test(result.text), 'Skal ikke vise duplikatmelding eller duplikate oppgaver').toBeFalsy();
  expect(result.taskCount <= 1, `Forventet maks 1 oppgave, fikk ${result.taskCount}`).toBeTruthy();
});
