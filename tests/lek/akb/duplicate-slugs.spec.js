const { test, expect } = require('../../testlab');
const { setQaContext, mergeActual } = require('../helpers');
const { loadAkbData } = require('./shared');

test('AKB Duplicate slugs: ingen artikler skal dele samme slug', async ({ page }, testInfo) => {
  let data;
  try {
    data = await loadAkbData(page, testInfo);
  } catch (e) {
    if (e?.code === 'AKB_ENDPOINT_UNAVAILABLE') {
      test.skip(true, 'AKB endpoint not implemented or not exposed in staging.');
      return;
    }
    throw e;
  }

  const { articles } = data;
  const counts = new Map();
  for (const article of articles) {
    const slug = String(article.slug || article.knowledge_slug || '').trim();
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }));
  setQaContext(testInfo, {
    expected: { duplicates: [] }
  });
  mergeActual(testInfo, { duplicates });

  expect(duplicates, `Dupliserte slugs funnet: ${duplicates.map((item) => `${item.slug} (${item.count})`).join(', ')}`).toHaveLength(0);
});
