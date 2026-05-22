const fs = require('node:fs');
const path = require('node:path');
const base = require('@playwright/test');

const { expect } = base;

function sanitizeFileName(value) {
  return String(value || 'test')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function requireBaseUrl(testInfo) {
  if (process.env.BASE_URL) return;
  base.test.skip(true, 'Sett BASE_URL (f.eks. repository variable) for å kjøre app-testene.');
}

async function gotoAndMeasure(page, testInfo, url) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const ms = Date.now() - t0;
  testInfo.annotations.push({ type: 'metric', description: `loadMs=${ms}` });
  return ms;
}

const test = base.test;

test.afterEach(async ({ page }, testInfo) => {
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (!failed) return;

  const fileName = `${sanitizeFileName(testInfo.title)}-${timestamp()}.png`;
  const relPath = path.join('screenshots', fileName);
  const absPath = path.join(process.cwd(), relPath);

  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await page.screenshot({ path: absPath, fullPage: true });
  testInfo.attachments.push({ name: 'failure-screenshot', path: relPath, contentType: 'image/png' });
});

module.exports = { test, expect, requireBaseUrl, gotoAndMeasure };
