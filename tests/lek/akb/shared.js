const { ensureAuthenticated, openPath } = require('../../testlab');
const { annotateSuite, setQaContext, mergeActual, fetchJsonCandidates, normalizeArticles, extractSelectableKeys } = require('../helpers');

const KNOWLEDGE_ENDPOINTS = [
  '/api/knowledge',
  '/api/knowledge/articles',
  '/api/akb/articles',
  '/api/articles',
  '/knowledge.json'
];

const INSPECTION_ENDPOINTS = [
  '/api/inspection/options',
  '/api/inspection/schema',
  '/api/aurora/schema',
  '/api/forms/inspection',
  '/api/inspections/schema'
];

async function loadAkbData(page, testInfo) {
  annotateSuite(testInfo, 'akb');
  await ensureAuthenticated(page, testInfo);
  await openPath(page, testInfo, '/dashboard');

  const knowledge = await fetchJsonCandidates(page, KNOWLEDGE_ENDPOINTS);
  const inspection = await fetchJsonCandidates(page, INSPECTION_ENDPOINTS);

  const articles = normalizeArticles(knowledge.json);
  const selectableKeys = extractSelectableKeys(inspection.json);

  setQaContext(testInfo, {
    notes: `Knowledge endpoint: ${knowledge.candidate} | Inspection endpoint: ${inspection.candidate}`
  });
  mergeActual(testInfo, {
    knowledgeEndpoint: knowledge.candidate,
    inspectionEndpoint: inspection.candidate,
    articleCount: articles.length,
    selectableCount: selectableKeys.length
  });

  return { articles, selectableKeys, knowledgeEndpoint: knowledge.candidate, inspectionEndpoint: inspection.candidate };
}

module.exports = { loadAkbData };
