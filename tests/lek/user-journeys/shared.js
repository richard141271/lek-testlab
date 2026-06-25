const { expect, ensureAuthenticated, openPath, loginIfNeeded } = require('../../testlab');
const { annotateSuite: annotate, setQaContext: setContext, mergeActual: merge } = require('../helpers');

async function navigateByName(page, patterns) {
  const regex = new RegExp(patterns.join('|'), 'i');
  const candidates = [
    page.getByRole('link', { name: regex }).first(),
    page.getByRole('button', { name: regex }).first(),
    page.getByText(regex).first()
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      return true;
    }
  }
  return false;
}

async function beginJourney(page, testInfo, suite, input, expected) {
  annotate(testInfo, 'user-journeys');
  setContext(testInfo, { input, expected, notes: suite });
  await ensureAuthenticated(page, testInfo);
  await openPath(page, testInfo, '/dashboard');
}

function recordJourney(testInfo, actual) {
  merge(testInfo, actual);
}

module.exports = { expect, openPath, loginIfNeeded, navigateByName, beginJourney, recordJourney };
