const { defineConfig, devices } = require('@playwright/test');

const target = String(process.env.TARGET || 'lek').toLowerCase();
const lekBaseURL = process.env.LEK_BASE_URL || process.env.BASE_URL || 'https://staging.lekbie.no';
const varroaBaseURL = process.env.VARROASCAN_BASE_URL || undefined;

const projects = [];
if (target === 'lek' || target === 'all') {
  projects.push({
    name: 'lek',
    testMatch: ['lek/**/*.spec.js'],
    use: { ...devices['Desktop Chrome'], baseURL: lekBaseURL }
  });
}
if (target === 'varroascan' || target === 'all') {
  projects.push({
    name: 'varroascan',
    testMatch: ['varroascan/**/*.spec.js'],
    use: { ...devices['Desktop Chrome'], baseURL: varroaBaseURL }
  });
}

if (!projects.length) {
  projects.push({
    name: 'lek',
    testMatch: ['lek/**/*.spec.js'],
    use: { ...devices['Desktop Chrome'], baseURL: lekBaseURL }
  });
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-report', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }]
  ],
  outputDir: 'test-results',
  use: {
    screenshot: 'off',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects
});
