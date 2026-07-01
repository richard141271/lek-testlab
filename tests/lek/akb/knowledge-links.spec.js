const { test, expect } = require('../../testlab');
const { setQaContext, mergeActual } = require('../helpers');
const { loadAkbData } = require('./shared');

test('AKB Knowledge links: artikler skal ha gyldige interne lenker eller slug-referanser', async ({ page }, testInfo) => {
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
  const invalid = [];

  for (const article of articles) {
    const slug = article.slug || article.knowledge_slug || article.id || 'ukjent';
    const links = article.related_links || article.knowledge_links || article.links || [];
    for (const link of Array.isArray(links) ? links : []) {
      const value = typeof link === 'string' ? link : link?.slug || link?.href || '';
      if (!value || !/^(\/|https?:\/\/|[a-z0-9_-]+$)/i.test(String(value))) invalid.push({ slug, value });
    }
  }

  setQaContext(testInfo, {
    expected: { invalidLinks: [] }
  });
  mergeActual(testInfo, { invalidLinks: invalid });

  expect(invalid, `Ugyldige knowledge-lenker: ${invalid.map((item) => `${item.slug}:${item.value}`).join(', ')}`).toHaveLength(0);
});
