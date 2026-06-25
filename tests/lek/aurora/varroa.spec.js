const { test, expect } = require('../../testlab');
const { runAuroraScenario } = require('./shared');

test('Aurora: varroa-observasjon gir relevante tiltak og oppfølging', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      notes: 'Jeg observerte tydelige tegn til varroa.'
    },
    expected: {
      biologicalRules: ['varroa-followup']
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  expect(/varroa/i.test(result.text), 'Forventet omtale av Varroa').toBeTruthy();
  expect(/behandling|oppf[oø]lging|kontroll/i.test(result.text), 'Forventet anbefalt tiltak eller oppfølging').toBeTruthy();
});
