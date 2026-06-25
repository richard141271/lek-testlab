const { expect } = require('../testlab');

function annotateSuite(testInfo, suite) {
  testInfo.annotations.push({ type: 'suite', description: suite });
}

function setQaContext(testInfo, data) {
  const current = testInfo._lekQaContext || {};
  testInfo._lekQaContext = {
    ...current,
    ...data
  };
}

function mergeActual(testInfo, actual) {
  const current = testInfo._lekQaContext || {};
  testInfo._lekQaContext = {
    ...current,
    actual: {
      ...(current.actual || {}),
      ...(actual || {})
    }
  };
}

function setAiHints(testInfo, hints) {
  const current = testInfo._lekQaContext || {};
  testInfo._lekQaContext = {
    ...current,
    likelyFiles: Array.isArray(hints?.likelyFiles) ? hints.likelyFiles : current.likelyFiles || [],
    possibleCauses: Array.isArray(hints?.possibleCauses) ? hints.possibleCauses : current.possibleCauses || [],
    recommendedChecks: Array.isArray(hints?.recommendedChecks) ? hints.recommendedChecks : current.recommendedChecks || []
  };
}

async function clickFirstVisible(page, locators) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function openFirstReachable(page, testInfo, openPath, paths, readyLocator) {
  let lastError = null;
  for (const path of paths) {
    try {
      await openPath(page, testInfo, path);
      if (!readyLocator) return path;
      if (await readyLocator(page).isVisible().catch(() => false)) return path;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error(`Fant ingen side for kandidater: ${paths.join(', ')}`);
}

async function pickChoice(page, candidates, value) {
  if (value == null) return false;
  const normalized = String(value).toLowerCase();
  for (const candidate of candidates) {
    const control = candidate(page).first();
    if (!(await control.isVisible().catch(() => false))) continue;

    const tagName = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const match = await control
        .evaluate((el, wanted) => {
          const options = Array.from(el.options || []);
          const found = options.find((option) => {
            const label = String(option.label || '').toLowerCase();
            const value = String(option.value || '').toLowerCase();
            return label.includes(wanted) || value.includes(wanted);
          });
          return found ? found.value : '';
        }, normalized)
        .catch(() => '');
      if (match) await control.selectOption(match).catch(() => {});
      return true;
    }

    if ((await control.getAttribute('type').catch(() => '')) === 'checkbox') {
      if (Boolean(value)) await control.check().catch(() => {});
      else await control.uncheck().catch(() => {});
      return true;
    }

    await control.click().catch(() => {});
    const option = page.getByRole('option', { name: new RegExp(normalized, 'i') }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      return true;
    }
  }
  return false;
}

async function setBooleanField(page, labels, value) {
  if (value == null) return false;
  const regex = new RegExp(labels.join('|'), 'i');
  const yesLabels = [/ja/i, /yes/i, /sett/i, /observed/i];
  const noLabels = [/nei/i, /no/i, /ikke sett/i, /not seen/i];
  const desired = value ? yesLabels : noLabels;

  const containers = [
    page.getByLabel(regex).first(),
    page.getByText(regex).first()
  ];

  for (const container of containers) {
    if (!(await container.isVisible().catch(() => false))) continue;
    for (const label of desired) {
      const radio = page.getByRole('radio', { name: label }).first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.check().catch(async () => {
          await radio.click();
        });
        return true;
      }
      const button = page.getByRole('button', { name: label }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        return true;
      }
    }
  }

  const checkbox = page.getByLabel(regex).first();
  if (await checkbox.isVisible().catch(() => false)) {
    if (value) await checkbox.check().catch(() => {});
    else await checkbox.uncheck().catch(() => {});
    return true;
  }
  return false;
}

async function fillAuroraForm(page, input) {
  if (input.notes) {
    const notes = page
      .getByRole('textbox', { name: /notat|observasjon|beskrivelse|symptom/i })
      .or(page.locator('textarea').first())
      .first();
    if (await notes.isVisible().catch(() => false)) await notes.fill(String(input.notes));
  }

  await setBooleanField(page, ['dronning', 'queen'], input.queen_seen);
  await setBooleanField(page, ['egg', 'eggs'], input.eggs_seen);

  await pickChoice(
    page,
    [
      (p) => p.getByLabel(/mat|f[oô]r|food/i),
      (p) => p.getByRole('combobox', { name: /mat|f[oô]r|food/i }),
      (p) => p.locator('select').first()
    ],
    input.food_status
  );

  await pickChoice(
    page,
    [
      (p) => p.getByLabel(/temperament/i),
      (p) => p.getByRole('combobox', { name: /temperament/i })
    ],
    input.temperament
  );

  await pickChoice(
    page,
    [
      (p) => p.getByLabel(/sesong|season/i),
      (p) => p.getByRole('combobox', { name: /sesong|season/i })
    ],
    input.season
  );

  await pickChoice(
    page,
    [
      (p) => p.getByLabel(/eggmengde|egg amount/i),
      (p) => p.getByRole('combobox', { name: /eggmengde|egg amount/i })
    ],
    input.egg_amount
  );
}

async function submitAurora(page) {
  const submitted = await clickFirstVisible(page, [
    page.getByRole('button', { name: /analyser|analyse|generer|fortsett|lag forslag|save|send/i }).first(),
    page.locator('button[type="submit"]').first(),
    page.getByRole('button').first()
  ]);
  if (!submitted) throw new Error('Fant ingen knapp for å sende inn Aurora-inspeksjon.');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(800);
}

async function collectAuroraResult(page) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const slugMatches = [...bodyText.matchAll(/\b[a-z0-9_]{3,}\b/g)].map((m) => m[0]);
  const uniqueSlugs = [...new Set(slugMatches.filter((s) => s.includes('_')))];
  const taskCount = await page
    .locator('[data-testid*="task"], .task, li')
    .evaluateAll((els) => els.filter((el) => /oppgave|task/i.test(el.textContent || '')).length)
    .catch(() => 0);
  return {
    text: bodyText,
    taskCount,
    knowledgeSlugs: uniqueSlugs
  };
}

async function fetchJsonCandidates(page, candidates, options) {
  const result = await page.evaluate(
    async ({ candidates: candidateList, options: opts }) => {
      for (const candidate of candidateList) {
        try {
          const response = await fetch(candidate, {
            method: opts?.method || 'GET',
            headers: { 'content-type': 'application/json' },
            body: opts?.body ? JSON.stringify(opts.body) : undefined
          });
          const text = await response.text();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          if (response.ok && json != null) return { ok: true, candidate, json };
        } catch {}
      }
      return { ok: false };
    },
    { candidates, options }
  );
  if (!result?.ok) {
    throw new Error(`Fant ingen JSON-endpoint som svarte for kandidater: ${candidates.join(', ')}`);
  }
  return result;
}

function normalizeArticles(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractSelectableKeys(payload) {
  const keys = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.slug === 'string') keys.add(node.slug);
    if (typeof node.key === 'string') keys.add(node.key);
    if (typeof node.id === 'string' && /food|queen|egg|swarm|varroa|temperament/i.test(node.id)) keys.add(node.id);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(payload);
  return [...keys];
}

function expectTextIncludes(text, regex, message) {
  expect(regex.test(text), message).toBeTruthy();
}

module.exports = {
  annotateSuite,
  setQaContext,
  mergeActual,
  setAiHints,
  openFirstReachable,
  fillAuroraForm,
  submitAurora,
  collectAuroraResult,
  fetchJsonCandidates,
  normalizeArticles,
  extractSelectableKeys,
  expectTextIncludes
};
