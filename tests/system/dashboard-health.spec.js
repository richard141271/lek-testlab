const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { annotateSuite } = require('../lek/helpers');

const root = process.cwd();

test('System Health: dashboard har seksjoner, resultater og detaljpanel', async ({}, testInfo) => {
  annotateSuite(testInfo, 'system');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

  expect(html.includes('id="testRows"')).toBeTruthy();
  expect(html.includes('id="suiteRows"')).toBeTruthy();
  expect(html.includes('id="errorCard"')).toBeTruthy();
  expect(html.includes('id="errorStructured"')).toBeTruthy();
  expect(html.includes('id="versionTag"')).toBeTruthy();

  expect(js.includes('renderTable(rows)')).toBeTruthy();
  expect(js.includes('renderSuiteCards(rows)')).toBeTruthy();
  expect(js.includes('renderDetails(row)')).toBeTruthy();
  expect(js.includes('loadQaDetails')).toBeTruthy();
  expect(js.includes('renderVersion(STATE.meta)')).toBeTruthy();
  expect(js.includes('report?.stats?.expected')).toBeTruthy();
  expect(js.includes('report?.stats?.unexpected')).toBeTruthy();
  expect(js.includes('expectedStatus === \'skipped\'')).toBeTruthy();
});
