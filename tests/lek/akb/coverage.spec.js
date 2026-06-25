const { test, expect } = require('../../testlab');
const { setQaContext, mergeActual } = require('../helpers');
const { loadAkbData } = require('./shared');

test('AKB Coverage: alt brukeren kan velge i inspeksjonen har knowledge article', async ({ page }, testInfo) => {
  const { articles, selectableKeys } = await loadAkbData(page, testInfo);
  const slugs = new Set(
    articles.map((article) => String(article.slug || article.knowledge_slug || article.id || '').trim()).filter(Boolean)
  );
  const covered = selectableKeys.filter((key) => slugs.has(key));
  const missing = selectableKeys.filter((key) => !slugs.has(key));

  setQaContext(testInfo, {
    expected: { coverage: `${selectableKeys.length}/${selectableKeys.length}`, status: 'PASS' }
  });
  mergeActual(testInfo, {
    coverage: `${covered.length}/${selectableKeys.length}`,
    missing
  });

  expect(missing, `AKB Coverage mangler artikler for: ${missing.join(', ')}`).toHaveLength(0);
});
