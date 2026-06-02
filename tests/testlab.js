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

async function gotoAndMeasure(page, testInfo, url) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const ms = Date.now() - t0;
  testInfo.annotations.push({ type: 'metric', description: `loadMs=${ms}` });
  return ms;
}

async function openPath(page, testInfo, pathname) {
  const baseURL = testInfo.project?.use?.baseURL;
  if (!baseURL) {
    throw new Error(`Mangler baseURL for project "${testInfo.project?.name || 'ukjent'}". Sjekk secrets/vars i workflow.`);
  }
  const url = new URL(pathname, baseURL).toString();
  await gotoAndMeasure(page, testInfo, url);
}

function needsLogin(page) {
  const url = page.url().toLowerCase();
  return url.includes('/login') || url.includes('signin') || url.includes('auth');
}

function projectName(testInfo) {
  return String(testInfo?.project?.name || '').toLowerCase();
}

async function loginIfNeeded(page, testInfo) {
  const proj = projectName(testInfo);
  if (proj !== 'lek') {
    if (needsLogin(page) || (await page.locator('input[type="password"]').first().isVisible().catch(() => false))) {
      throw new Error(`Login kreves, men ingen login-strategi er konfigurert for target "${proj || 'ukjent'}"`);
    }
    return;
  }

  if (!needsLogin(page)) {
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible().catch(() => false)) {
      return loginWithEnv(page, testInfo);
    }
    return;
  }
  await loginWithEnv(page, testInfo);
}

async function loginWithEnv(page, testInfo) {
  const emailValue = process.env.LEK_EMAIL || '';
  const passwordValue = process.env.LEK_PASSWORD || '';
  if (!emailValue || !passwordValue) {
    throw new Error('Mangler LEK_EMAIL/LEK_PASSWORD. Sett secrets i GitHub Actions eller miljøvariabler lokalt.');
  }

  const email = page
    .getByLabel(/e-?post|email/i)
    .or(page.getByPlaceholder(/e-?post|email/i))
    .or(page.locator('input[type="email"]'))
    .first();
  const password = page
    .getByLabel(/passord|password/i)
    .or(page.getByPlaceholder(/passord|password/i))
    .or(page.locator('input[type="password"]'))
    .first();

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  await email.fill(emailValue);
  await password.fill(passwordValue);

  const submit = page
    .getByRole('button', { name: /logg inn|login|sign in/i })
    .or(page.getByRole('button', { name: /fortsett|continue/i }))
    .or(page.locator('button[type="submit"]'))
    .first();

  await expect(submit).toBeVisible();
  await submit.click();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);

  const dashboardSignal = page
    .getByRole('heading', { name: /dashboard/i })
    .or(page.locator('[data-testid="dashboard"]'))
    .or(page.locator('text=/dashboard/i').first())
    .first();

  if (await dashboardSignal.isVisible().catch(() => false)) return;

  const url = page.url().toLowerCase();
  if (url.includes('/dashboard')) return;

  testInfo.annotations.push({ type: 'warning', description: 'Login fullførte uten tydelig dashboard-signal' });
}

async function ensureAuthenticated(page, testInfo) {
  const proj = projectName(testInfo);
  if (proj !== 'lek') return;

  const baseURL = testInfo.project?.use?.baseURL;
  if (!baseURL) throw new Error('Mangler baseURL for LEK');
  const url = new URL('/dashboard', baseURL).toString();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await loginIfNeeded(page, testInfo);
}

async function ensureOnPage(page, testInfo, pathname) {
  await ensureAuthenticated(page, testInfo);
  await openPath(page, testInfo, pathname);
  await loginIfNeeded(page, testInfo);
}

const test = base.test;

test.beforeEach(async ({ page }, testInfo) => {
  const errors = [];
  testInfo._lekConsoleErrors = errors;

  page.on('pageerror', (err) => {
    errors.push({ kind: 'pageerror', message: String(err?.message || err), stack: String(err?.stack || '') });
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    errors.push({ kind: 'console', message: msg.text(), location: msg.location() });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (!failed) return;

  const fileName = `${sanitizeFileName(testInfo.title)}-${timestamp()}.png`;
  const relPath = path.join('screenshots', fileName);
  const absPath = path.join(process.cwd(), relPath);

  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await page.screenshot({ path: absPath, fullPage: true });
  testInfo.attachments.push({ name: 'failure-screenshot', path: relPath, contentType: 'image/png' });

  const errors = Array.isArray(testInfo._lekConsoleErrors) ? testInfo._lekConsoleErrors : [];
  if (errors.length) {
    const consoleName = `${sanitizeFileName(testInfo.title)}-${timestamp()}.txt`;
    const consoleRel = path.join('reports', 'console', consoleName);
    const consoleAbs = path.join(process.cwd(), consoleRel);
    await fs.promises.mkdir(path.dirname(consoleAbs), { recursive: true });
    await fs.promises.writeFile(consoleAbs, JSON.stringify({ url: page.url(), errors }, null, 2), 'utf8');
    testInfo.attachments.push({ name: 'console-errors', path: consoleRel, contentType: 'text/plain' });
  }
});

module.exports = { test, expect, gotoAndMeasure, openPath, ensureOnPage, loginIfNeeded, ensureAuthenticated };
