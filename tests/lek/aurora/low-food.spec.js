const { test } = require('../../testlab');
const { runAuroraScenario, assertAuroraOutcome } = require('./shared');

test('Aurora: lite mat foreslår støttefôring med kort oppfølging', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      food_status: 'lite'
    },
    expected: {
      knowledgeSlugs: ['for_lite'],
      follow_up_days: 3,
      maxTasks: 1,
      recommendation: 'støttefôring'
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  assertAuroraOutcome(result, {
    includes: [
      { regex: /støttef[oô]ring|f[oô]ring/i, message: 'Forventet forslag om støttefôring' },
      { regex: /\b3\b.*dag|dag.*\b3\b/i, message: 'Forventet oppfølging om 3 dager' }
    ],
    knowledgeSlugs: ['for_lite'],
    maxTasks: 1
  });
});
