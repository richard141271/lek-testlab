const { ensureAuthenticated, openPath } = require('../../testlab');
const { annotateSuite, setQaContext, mergeActual, normalizeArticles, extractSelectableKeys } = require('../helpers');

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

  const probe = async (candidates) => {
    return await page.evaluate(async (list) => {
      const results = [];
      for (const candidate of list) {
        try {
          const res = await fetch(candidate, { method: 'GET' });
          const text = await res.text();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          results.push({ candidate, ok: res.ok && json != null, status: res.status, json });
          if (res.ok && json != null) return { found: true, candidate, status: res.status, json, results };
        } catch (e) {
          results.push({ candidate, ok: false, status: 0, json: null });
        }
      }
      return { found: false, results };
    }, candidates);
  };

  const knowledge = await probe(KNOWLEDGE_ENDPOINTS);
  if (!knowledge.found) {
    const statuses = (knowledge.results || []).map((r) => r.status);
    const allMissingOrForbidden = statuses.every((s) => s === 0 || s === 401 || s === 403 || s === 404);
    if (allMissingOrForbidden) {
      const err = new Error('AKB endpoint not implemented or not exposed in staging.');
      err.code = 'AKB_ENDPOINT_UNAVAILABLE';
      throw err;
    }
    throw new Error(`AKB knowledge-endpoint svarte uventet: ${JSON.stringify(knowledge.results || []).slice(0, 500)}`);
  }

  const inspection = await probe(INSPECTION_ENDPOINTS);
  if (!inspection.found) {
    const statuses = (inspection.results || []).map((r) => r.status);
    const allMissingOrForbidden = statuses.every((s) => s === 0 || s === 401 || s === 403 || s === 404);
    if (allMissingOrForbidden) {
      const err = new Error('AKB endpoint not implemented or not exposed in staging.');
      err.code = 'AKB_ENDPOINT_UNAVAILABLE';
      throw err;
    }
    throw new Error(`Inspection schema-endpoint svarte uventet: ${JSON.stringify(inspection.results || []).slice(0, 500)}`);
  }

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
