const { test, expect } = require('../../testlab');
const { setAiHints, setQaContext, mergeActual, annotateSuite } = require('../helpers');
const { runAuroraScenario } = require('../aurora/shared');

test('Regression: issue-001 duplicate tasks kommer ikke tilbake', async ({ page }, testInfo) => {
  annotateSuite(testInfo, 'regression');
  setQaContext(testInfo, {
    input: { food_status: 'lite', notes: 'Lite mat nevnt flere ganger i samme notat.' },
    expected: { tasks: 1, noDuplicates: true }
  });
  setAiHints(testInfo, {
    likelyFiles: ['aurora.ts', 'new-inspection/page.tsx'],
    possibleCauses: ['Duplikat-parsering av notater', 'Manglende gruppering av observasjoner'],
    recommendedChecks: ['Kontroller parseInspectionNotes()', 'Verifiser deduplisering av oppgaver']
  });

  const result = await runAuroraScenario(page, testInfo, {
    input: { food_status: 'lite', notes: 'Lite mat nevnt flere ganger i samme notat.' },
    expected: { maxTasks: 1 }
  });

  mergeActual(testInfo, { tasks: result.taskCount, knowledgeSlugs: result.knowledgeSlugs });
  expect(result.taskCount <= 1, `Bug issue-001 er tilbake: forventet 1 oppgave, fikk ${result.taskCount}`).toBeTruthy();
  expect(/duplikat|duplicate/i.test(result.text), 'Bug issue-001 er tilbake: duplikatmelding synlig').toBeFalsy();
});
