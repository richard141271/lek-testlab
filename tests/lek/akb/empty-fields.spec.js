const { test, expect } = require('../../testlab');
const { setQaContext, mergeActual } = require('../helpers');
const { loadAkbData } = require('./shared');

test('AKB Empty fields: anbefalinger, årsaker og kort beskrivelse skal ikke være tomme', async ({ page }, testInfo) => {
  const { articles } = await loadAkbData(page, testInfo);
  const requiredFields = ['recommended_actions', 'possible_causes', 'short_description'];
  const invalid = [];

  for (const article of articles) {
    const slug = article.slug || article.knowledge_slug || article.id || 'ukjent';
    for (const field of requiredFields) {
      const value = article[field];
      const emptyArray = Array.isArray(value) && value.length === 0;
      const emptyString = typeof value === 'string' && value.trim() === '';
      if (value == null || emptyArray || emptyString) invalid.push({ slug, field });
    }
  }

  setQaContext(testInfo, {
    expected: { requiredFields }
  });
  mergeActual(testInfo, { invalid });

  expect(invalid, `Tomme felter funnet: ${invalid.map((item) => `${item.slug}:${item.field}`).join(', ')}`).toHaveLength(0);
});
