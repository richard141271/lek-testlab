const { ensureAuthenticated, openPath } = require('../../testlab');
const { annotateSuite, setQaContext, mergeActual, fetchJsonCandidates } = require('../helpers');

const RULE_ENDPOINTS = ['/api/aurora/evaluate', '/api/aurora/analyze', '/api/aurora/rules', '/api/inspections/preview'];

async function evaluateBiology(page, testInfo, payload, expected) {
  annotateSuite(testInfo, 'biology');
  setQaContext(testInfo, {
    input: payload,
    expected,
    biologicalRules: expected?.biologicalRules || []
  });

  await ensureAuthenticated(page, testInfo);
  await openPath(page, testInfo, '/dashboard');

  const response = await fetchJsonCandidates(page, RULE_ENDPOINTS, { method: 'POST', body: payload });
  mergeActual(testInfo, {
    endpoint: response.candidate,
    response: response.json
  });
  return response.json;
}

function responseText(json) {
  return JSON.stringify(json).toLowerCase();
}

module.exports = { evaluateBiology, responseText };
