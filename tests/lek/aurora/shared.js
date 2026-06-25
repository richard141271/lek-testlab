const { expect, ensureAuthenticated, openPath } = require('../../testlab');
const {
  annotateSuite,
  setQaContext,
  mergeActual,
  openFirstReachable,
  fillAuroraForm,
  submitAurora,
  collectAuroraResult,
  expectTextIncludes
} = require('../helpers');

async function openAurora(page, testInfo) {
  annotateSuite(testInfo, 'aurora');
  await ensureAuthenticated(page, testInfo);
  return openFirstReachable(
    page,
    testInfo,
    openPath,
    ['/aurora', '/inspections/new', '/inspection/new', '/inspeksjon/ny', '/inspections/create'],
    (p) =>
      p
        .getByRole('button', { name: /analyser|analyse|generer|fortsett|lag forslag|save|send/i })
        .or(p.locator('form').first())
        .or(p.locator('textarea').first())
        .first()
  );
}

async function runAuroraScenario(page, testInfo, scenario) {
  setQaContext(testInfo, {
    input: scenario.input,
    expected: scenario.expected,
    knowledgeSlugs: scenario.expected?.knowledgeSlugs || [],
    biologicalRules: scenario.expected?.biologicalRules || []
  });

  await openAurora(page, testInfo);
  await fillAuroraForm(page, scenario.input);

  if (scenario.inputText) {
    const notes = page
      .getByRole('textbox', { name: /notat|observasjon|beskrivelse|symptom/i })
      .or(page.locator('textarea').first())
      .first();
    await expect(notes).toBeVisible();
    await notes.fill(scenario.inputText);
  }

  await submitAurora(page);
  const result = await collectAuroraResult(page);
  mergeActual(testInfo, {
    pageTextExcerpt: result.text.slice(0, 1200),
    taskCount: result.taskCount,
    knowledgeSlugs: result.knowledgeSlugs
  });
  return result;
}

function assertAuroraOutcome(result, rules) {
  const text = result.text;
  if (rules.includes) {
    for (const rule of rules.includes) expectTextIncludes(text, rule.regex, rule.message);
  }
  if (rules.excludes) {
    for (const rule of rules.excludes) {
      expect(rule.regex.test(text), rule.message).toBeFalsy();
    }
  }
  if (typeof rules.maxTasks === 'number') {
    expect(result.taskCount <= rules.maxTasks, `Forventet maks ${rules.maxTasks} oppgaver, fikk ${result.taskCount}`).toBeTruthy();
  }
  if (typeof rules.exactTasks === 'number') {
    expect(result.taskCount === rules.exactTasks, `Forventet ${rules.exactTasks} oppgaver, fikk ${result.taskCount}`).toBeTruthy();
  }
  if (rules.knowledgeSlugs) {
    for (const slug of rules.knowledgeSlugs) {
      expect(result.knowledgeSlugs.includes(slug), `Forventet knowledge slug "${slug}"`).toBeTruthy();
    }
  }
}

module.exports = { runAuroraScenario, assertAuroraOutcome };
