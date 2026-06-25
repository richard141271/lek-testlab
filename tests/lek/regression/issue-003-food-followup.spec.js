const { test, expect } = require('../../testlab');
const { setAiHints, setQaContext, mergeActual, annotateSuite } = require('../helpers');
const { runAuroraScenario } = require('../aurora/shared');

test('Regression: issue-003 lite mat gir korrekt oppfølgingstid', async ({ page }, testInfo) => {
  annotateSuite(testInfo, 'regression');
  setQaContext(testInfo, {
    input: { food_status: 'lite' },
    expected: { follow_up_days: 3, knowledge_slug: 'for_lite' },
    knowledgeSlugs: ['for_lite']
  });
  setAiHints(testInfo, {
    likelyFiles: ['aurora.ts', 'knowledge.ts'],
    possibleCauses: ['Feil knowledge slug', 'Oppfølgingstid blir overskrevet av standardregel'],
    recommendedChecks: ['Verifiser getInspectionKnowledgeSlugs()', 'Se etter regel for follow_up_days']
  });

  const result = await runAuroraScenario(page, testInfo, {
    input: { food_status: 'lite' },
    expected: { knowledgeSlugs: ['for_lite'] }
  });
  mergeActual(testInfo, { text: result.text, knowledgeSlugs: result.knowledgeSlugs });

  expect(result.knowledgeSlugs.includes('for_lite'), 'Bug issue-003 er tilbake: slug "for_lite" mangler').toBeTruthy();
  expect(/\b3\b.*dag|dag.*\b3\b/i.test(result.text), 'Bug issue-003 er tilbake: oppfølging er ikke 3 dager').toBeTruthy();
});
