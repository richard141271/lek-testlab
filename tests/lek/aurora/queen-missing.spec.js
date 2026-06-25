const { test } = require('../../testlab');
const { runAuroraScenario, assertAuroraOutcome } = require('./shared');

test('Aurora: dronning ikke sett med egg skal gi rolig ny kontroll', async ({ page }, testInfo) => {
  const scenario = {
    input: {
      queen_seen: false,
      eggs_seen: true
    },
    expected: {
      knowledgeSlugs: ['queen_missing'],
      recommendation: 'ny kontroll',
      noPanic: true
    }
  };

  const result = await runAuroraScenario(page, testInfo, scenario);
  assertAuroraOutcome(result, {
    includes: [
      { regex: /ny kontroll|kontroller igjen|sjekk p[åa] nytt/i, message: 'Forventet anbefaling om ny kontroll' },
      { regex: /dronning|queen/i, message: 'Forventet at dronning omtales' }
    ],
    excludes: [{ regex: /panikk|akutt|kritisk/i, message: 'Skal ikke gi panikkmelding når egg er observert' }],
    knowledgeSlugs: ['queen_missing']
  });
});
