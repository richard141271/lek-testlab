const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { annotateSuite } = require('../lek/helpers');

const root = process.cwd();

test('System Health: qa-details inneholder standardisert og AI-vennlig struktur', async ({}, testInfo) => {
  annotateSuite(testInfo, 'system');
  const hooks = fs.readFileSync(path.join(root, 'tests', 'testlab.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

  const requiredKeys = [
    'likely_files',
    'possible_causes',
    'recommended_checks',
    'ai_friendly_output',
    'standard_report'
  ];
  for (const key of requiredKeys) expect(hooks.includes(key)).toBeTruthy();

  expect(html.includes('id="qaSlugs"')).toBeTruthy();
  expect(html.includes('id="qaBioRules"')).toBeTruthy();
  expect(js.includes('loadQaDetails')).toBeTruthy();
  expect(js.includes('prettyJson(qa.input)')).toBeTruthy();
});
