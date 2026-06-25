const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { annotateSuite } = require('../lek/helpers');

const root = process.cwd();

test('System Health: target-konfig og Playwright-prosjekter er konsistente', async ({}, testInfo) => {
  annotateSuite(testInfo, 'system');
  const targets = JSON.parse(fs.readFileSync(path.join(root, 'targets.json'), 'utf8'));
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');

  const ids = targets.targets.map((target) => target.id);
  expect(ids).toEqual(expect.arrayContaining(['lek', 'varroascan']));
  expect(config.includes("name: 'lek'")).toBeTruthy();
  expect(config.includes("name: 'varroascan'")).toBeTruthy();
  expect(config.includes("name: 'system'")).toBeTruthy();
  expect(workflow.includes('workflow_dispatch')).toBeTruthy();
  expect(workflow.includes('target:')).toBeTruthy();
});
