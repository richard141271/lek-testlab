const { test, expect } = require('../../testlab');
const { setAiHints, setQaContext, mergeActual, annotateSuite } = require('../helpers');
const { runAuroraScenario } = require('../aurora/shared');

test('Regression: issue-004 DWV gir kun én oppgave', async ({ page }, testInfo) => {
  annotateSuite(testInfo, 'regression');
  setQaContext(testInfo, {
    input: 'Jeg så bier med deformerte vinger',
    expected: { tasks: 1, biologicalRules: ['dwv_possible', 'varroa_check_required'] },
    biologicalRules: ['dwv_possible', 'varroa_check_required']
  });
  setAiHints(testInfo, {
    likelyFiles: ['aurora.ts', 'new-inspection/page.tsx'],
    possibleCauses: ['Notatparser lager flere oppgaver', 'Manglende gruppering av observasjoner'],
    recommendedChecks: ['Kontroller parseInspectionNotes()', 'Verifiser oppgavegruppering for DWV/Varroa']
  });

  const result = await runAuroraScenario(page, testInfo, {
    input: {},
    inputText: 'Jeg så bier med deformerte vinger',
    expected: { exactTasks: 1 }
  });
  mergeActual(testInfo, { tasks: result.taskCount, text: result.text, knowledgeSlugs: result.knowledgeSlugs });

  expect(result.taskCount === 1, `Bug issue-004 er tilbake: forventet 1 oppgave, fikk ${result.taskCount}`).toBeTruthy();
  expect(/dwv/i.test(result.text), 'Bug issue-004 er tilbake: DWV omtales ikke').toBeTruthy();
});
