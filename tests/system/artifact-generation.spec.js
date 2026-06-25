const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { annotateSuite } = require('../lek/helpers');

const root = process.cwd();

test('System Health: artifact-generering er konfigurert for screenshot, video, trace og qa-details', async ({}, testInfo) => {
  annotateSuite(testInfo, 'system');
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  const hooks = fs.readFileSync(path.join(root, 'tests', 'testlab.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');

  expect(config.includes("trace: 'retain-on-failure'")).toBeTruthy();
  expect(config.includes("video: 'retain-on-failure'")).toBeTruthy();
  expect(hooks.includes("name: 'failure-screenshot'")).toBeTruthy();
  expect(hooks.includes("name: 'qa-details'")).toBeTruthy();
  expect(workflow.includes('test-results')).toBeTruthy();
  expect(workflow.includes('screenshots')).toBeTruthy();
  expect(workflow.includes('reports')).toBeTruthy();
});
