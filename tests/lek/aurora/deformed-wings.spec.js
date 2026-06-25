const { test } = require('../../testlab');
const { runAuroraScenario, assertAuroraOutcome } = require('./shared');

test('Aurora: deformerte vinger nevner DWV og Varroa med 7 dagers oppfølging', async ({ page }, testInfo) => {
  const scenario = {
    input: {},
    inputText: 'Jeg så noen bier med deformerte vinger.',
    expected: {
      follow_up_days: 7,
      exactTasks: 1,
      noDuplicates: true,
      biologicalRules: ['dwv-varroa-followup']
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  assertAuroraOutcome(result, {
    includes: [
      { regex: /dwv|deformed wing/i, message: 'Forventet henvisning til DWV' },
      { regex: /varroa/i, message: 'Forventet henvisning til Varroa' },
      { regex: /\b7\b.*dag|dag.*\b7\b/i, message: 'Forventet oppfølging om 7 dager' }
    ],
    excludes: [{ regex: /duplikat|duplicate/i, message: 'Skal ikke gi duplikate oppgaver' }],
    exactTasks: 1
  });
});
