const $ = (id) => document.getElementById(id);

const STATE = {
  report: null,
  tests: [],
  selectedId: null,
  meta: null
};

const CATEGORY_ORDER = {
  'UI Tests': 0,
  'Aurora Tests': 1,
  'AKB Tests': 2,
  'Biologiske Regler': 3,
  'User Journeys': 4,
  'Regression Tests': 5,
  'System Health': 6,
  'Offline Tests': 7
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('no-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(d);
}

function formatMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function statusToPill(status, warning) {
  const s = String(status || '').toLowerCase();
  if (s === 'passed' && warning) return { text: 'WARN', cls: 'statuspill--warn' };
  if (s === 'passed') return { text: 'PASS', cls: 'statuspill--ok' };
  if (s === 'failed') return { text: 'FAIL', cls: 'statuspill--critical' };
  if (s === 'skipped') return { text: 'SKIP', cls: 'statuspill--warn' };
  if (s === 'timedout') return { text: 'TIMEOUT', cls: 'statuspill--critical' };
  if (s === 'interrupted') return { text: 'STOP', cls: 'statuspill--warn' };
  return { text: status ? String(status).toUpperCase() : '—', cls: 'statuspill--warn' };
}

function safeText(value) {
  return value == null ? '' : String(value);
}

function normalizeId(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getMetric(spec, key) {
  const ann = spec?.annotations || [];
  for (const a of ann) {
    if (a?.type !== 'metric' || typeof a?.description !== 'string') continue;
    const m = a.description.match(new RegExp(`\\b${key}=([0-9.]+)\\b`));
    if (m) return Number(m[1]);
  }
  return null;
}

function getWarning(spec) {
  const ann = spec?.annotations || [];
  const found = ann.find((a) => a?.type === 'warning' && typeof a?.description === 'string');
  return found?.description || '';
}

function getSuiteAnnotation(spec) {
  const ann = spec?.annotations || [];
  const found = ann.find((a) => a?.type === 'suite' && typeof a?.description === 'string');
  return found?.description || '';
}

function getAnnotations(spec, result) {
  return result?.annotations || spec?.annotations || [];
}

function hasExplicitSkip(annotations) {
  return annotations.some((a) => a?.type === 'skip' && typeof a?.description === 'string' && a.description.trim());
}

function classifyStatus(result) {
  const status = String(result?.status || '').toLowerCase();
  const expectedStatus = String(result?.expectedStatus || '').toLowerCase();
  const explicitSkip = hasExplicitSkip(result?.annotations || []);

  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'timedout') return 'failed';
  if (status === 'interrupted') return 'interrupted';
  if (status === 'skipped') {
    if (expectedStatus === 'skipped' || explicitSkip) return 'skipped';
    return 'interrupted';
  }
  return status || 'unknown';
}

function summarizeRows(rows) {
  const summary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    warnings: 0,
    interrupted: 0
  };

  for (const row of rows) {
    const status = classifyStatus(row);
    if (status === 'passed') summary.passed += 1;
    else if (status === 'failed') summary.failed += 1;
    else if (status === 'skipped') summary.skipped += 1;
    else if (status === 'interrupted') summary.interrupted += 1;

    if (row.warning && status === 'passed') summary.warnings += 1;
  }

  return summary;
}

function flattenSuites(report) {
  const specs = [];
  const walk = (suite, parentTitles) => {
    const suiteTitle = safeText(suite?.title).trim();
    const nextTitles = suiteTitle ? [...parentTitles, suiteTitle] : parentTitles;
    for (const spec of suite?.specs || []) {
      specs.push({
        file: spec.file || suite.file || null,
        titlePath: [...nextTitles, safeText(spec.title)].filter(Boolean),
        spec
      });
    }
    for (const child of suite?.suites || []) walk(child, nextTitles);
  };
  for (const s of report?.suites || []) walk(s, []);
  return specs;
}

function extractLatestResult(spec) {
  const tests = spec?.tests || [];
  const lastTest = tests[tests.length - 1];
  const results = lastTest?.results || [];
  const lastResult = results[results.length - 1] || null;
  let status = lastResult?.status || lastTest?.status || null;
  if (!status) {
    if (spec?.ok === true) status = 'passed';
    else if (spec?.ok === false) status = 'failed';
  }
  const duration = typeof lastResult?.duration === 'number' ? lastResult.duration : typeof lastTest?.duration === 'number' ? lastTest.duration : null;
  const error = lastResult?.error || null;
  const attachments = lastResult?.attachments || [];
  const annotations = getAnnotations(lastTest, lastResult);
  return {
    status,
    expectedStatus: lastTest?.expectedStatus || null,
    duration,
    error,
    attachments,
    annotations,
    startTime: lastResult?.startTime || null
  };
}

function inferTarget(filePath) {
  const f = safeText(filePath).replace(/\\/g, '/').toLowerCase();
  if (f.includes('/varroascan/')) return 'varroascan';
  if (f.includes('/lek/')) return 'lek';
  return '';
}

function inferCategory(filePath, suiteAnnotation, title) {
  const file = safeText(filePath).replace(/\\/g, '/').toLowerCase();
  const suite = safeText(suiteAnnotation).toLowerCase();
  const t = safeText(title).toLowerCase();
  if (suite === 'system' || file.includes('/system/')) return 'System Health';
  if (suite === 'regression' || file.includes('/regression/')) return 'Regression Tests';
  if (suite === 'aurora' || file.includes('/aurora/')) return 'Aurora Tests';
  if (suite === 'akb' || file.includes('/akb/')) return 'AKB Tests';
  if (suite === 'biology' || file.includes('/biology/')) return 'Biologiske Regler';
  if (suite === 'user-journeys' || file.includes('/user-journeys/')) return 'User Journeys';
  if (t.includes('offline') || file.endsWith('/offline.spec.js')) return 'Offline Tests';
  return 'UI Tests';
}

function parseLabelFromTitle(fullTitle) {
  const t = safeText(fullTitle).trim();
  if (!t) return { label: 'Ukjent test', subtitle: '' };
  const idx = t.indexOf(':');
  if (idx > 0) return { label: t.slice(0, idx).trim(), subtitle: t };
  return { label: t, subtitle: t };
}

function buildRowsFromReport(report) {
  const flat = flattenSuites(report);
  const rows = [];

  for (const item of flat) {
    const { spec, titlePath } = item;
    const { status, expectedStatus, duration, error, attachments, annotations, startTime } = extractLatestResult(spec);
    const loadMs = getMetric(spec, 'loadMs');
    const responseMs = loadMs != null ? loadMs : duration;
    const warningText = getWarning(spec);
    const suiteAnnotation = getSuiteAnnotation(spec);

    const screenshot = attachments.find((a) => a?.contentType === 'image/png' && typeof a?.path === 'string');
    const screenshotPath = screenshot?.path || null;

    const consoleFile = attachments.find((a) => a?.name === 'console-errors' && typeof a?.path === 'string');
    const consolePath = consoleFile?.path || null;

    const video = attachments.find((a) => a?.contentType === 'video/webm' && typeof a?.path === 'string');
    const videoPath = video?.path || null;
    const qaDetails = attachments.find((a) => a?.name === 'qa-details' && typeof a?.path === 'string');
    const qaDetailsPath = qaDetails?.path || null;

    const file = spec?.file || item?.file || '';
    const target = inferTarget(file);
    const title = safeText(titlePath[titlePath.length - 1] || spec?.title || '');
    const parsed = parseLabelFromTitle(title);
    const id = normalizeId([target, parsed.subtitle || title || 'test'].filter(Boolean).join('-'));
    const label = parsed.label;
    const errorText = error?.message || error?.stack || '';
    const category = inferCategory(file, suiteAnnotation, title);

    rows.push({
      id,
      label,
      target,
      category,
      subtitle: parsed.subtitle || title,
      titlePath,
      status,
      expectedStatus,
      annotations,
      startedAt: startTime || report?.stats?.startTime || null,
      responseMs,
      errorText,
      screenshotPath,
      consolePath,
      videoPath,
      qaDetailsPath,
      warning: Boolean(warningText),
      warningText
    });
  }

  const order = { failed: 0, timedout: 0, passed: 1, skipped: 2, interrupted: 3 };
  rows.sort((a, b) => {
    const sa = order[classifyStatus(a)] ?? 9;
    const sb = order[classifyStatus(b)] ?? 9;
    if (sa !== sb) return sa - sb;
    const ca = CATEGORY_ORDER[a.category] ?? 99;
    const cb = CATEGORY_ORDER[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return a.label.localeCompare(b.label);
  });
  return rows;
}

function prettyJson(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function loadReport() {
  const url = `reports/results.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  } catch (e) {
    return null;
  }
}

async function loadMeta() {
  const url = `reports/meta.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

function shortSha(sha) {
  const s = safeText(sha);
  return s ? s.slice(0, 7) : '';
}

function renderVersion(meta) {
  const versionTag = $('versionTag');
  if (!versionTag) return;

  const sha = shortSha(meta?.sha);
  const branch = safeText(meta?.branch);
  versionTag.textContent = sha ? `commit ${sha}` : 'commit —';
  versionTag.title = branch && sha ? `${branch} • ${safeText(meta.sha)}` : sha ? safeText(meta.sha) : 'Ingen meta.json funnet';
}

function renderSummary(report, rows) {
  const meta = STATE.meta || {};
  const branch = meta.branch ? safeText(meta.branch) : '';
  const sha = meta.sha ? shortSha(meta.sha) : '';

  if (!report) {
    $('passedCount').textContent = '—';
    $('failedCount').textContent = '—';
    $('warningCount').textContent = '—';
    $('lastRun').textContent = 'Ingen rapport funnet';
    $('runMeta').textContent = branch && sha ? `${branch} • ${sha}` : '—';
    return;
  }

  const summary = summarizeRows(rows);
  const passed = Number(report?.stats?.expected || 0);
  const failed = Number(report?.stats?.unexpected || 0);

  $('passedCount').textContent = String(passed);
  $('failedCount').textContent = String(failed);
  $('warningCount').textContent = String(summary.skipped);
  $('lastRun').textContent = formatDateTime(report?.stats?.startTime);

  const total = rows.length;
  const status = failed ? 'CRITICAL' : summary.skipped || summary.interrupted || summary.warnings ? 'WARNING' : 'OK';
  const bits = [`${total} tester`, status];
  if (summary.interrupted) bits.push(`${summary.interrupted} ikke kjørt`);
  if (branch) bits.push(branch);
  if (sha) bits.push(sha);
  $('runMeta').textContent = bits.join(' • ');
}

function renderTable(rows) {
  const container = $('testRows');
  container.innerHTML = '';

  if (!rows.length) {
    const r = document.createElement('div');
    r.className = 'table__row table__row--body';
    r.setAttribute('role', 'row');
    r.innerHTML = `
      <div class="table__cell" role="cell">
        <div class="name">Ingen testdata</div>
        <div class="sub">Kjør workflow i GitHub Actions for å generere ekte resultater.</div>
      </div>
      <div class="table__cell" role="cell"><span class="statuspill statuspill--warn">—</span></div>
      <div class="table__cell mono" role="cell">—</div>
      <div class="table__cell mono" role="cell">—</div>
      <div class="table__cell mono" role="cell">—</div>
    `;
    container.appendChild(r);
    return;
  }

  let currentCategory = '';
  for (const row of rows) {
    if (row.category !== currentCategory) {
      currentCategory = row.category;
      const section = document.createElement('div');
      section.className = 'table__row table__row--section';
      section.setAttribute('role', 'row');
      section.innerHTML = `<div class="table__cell" role="cell">${safeText(currentCategory)}</div>`;
      container.appendChild(section);
    }

    const r = document.createElement('div');
    r.className = 'table__row table__row--body';
    r.setAttribute('role', 'row');
    r.dataset.testId = row.id;

    const normalizedStatus = classifyStatus(row);
    const pill = statusToPill(normalizedStatus, row.warning);
    const hasError = normalizedStatus === 'failed';
    const infoText =
      hasError ? safeText(row.errorText).split('\n')[0].slice(0, 90) :
      normalizedStatus === 'interrupted' ? 'Ikke kjørt ferdig i denne runden' :
      row.warning ? safeText(row.warningText).slice(0, 90) :
      '—';

    r.innerHTML = `
      <div class="table__cell" role="cell">
        <div class="name">${safeText(row.label)}</div>
        <div class="sub mono">${safeText([row.target, row.subtitle].filter(Boolean).join(' • '))}</div>
      </div>
      <div class="table__cell" role="cell">
        <span class="statuspill ${pill.cls}">${pill.text}</span>
      </div>
      <div class="table__cell mono" role="cell">${formatDateTime(row.startedAt)}</div>
      <div class="table__cell mono" role="cell">${formatMs(row.responseMs)}</div>
      <div class="table__cell mono" role="cell">${infoText}</div>
    `;

    r.addEventListener('click', () => selectRow(row.id));
    container.appendChild(r);
  }
}

function renderSuiteCards(rows) {
  const container = $('suiteRows');
  if (!container) return;
  container.innerHTML = '';
  const suites = ['UI Tests', 'Aurora Tests', 'AKB Tests', 'Biologiske Regler', 'User Journeys', 'Regression Tests', 'System Health', 'Offline Tests'];

  for (const suite of suites) {
    const items = rows.filter((row) => row.category === suite);
    const fails = items.filter((row) => classifyStatus(row) === 'failed').length;
    const warns = items.filter((row) => row.warning).length;
    const card = document.createElement('div');
    card.className = 'suitecard';
    card.innerHTML = `
      <div class="suitecard__title">${suite}</div>
      <div class="suitecard__value">${items.length || 0}</div>
      <div class="suitecard__meta">${fails} FAIL • ${warns} WARN</div>
    `;
    container.appendChild(card);
  }
}

async function loadQaDetails(pathname) {
  if (!pathname) return null;
  try {
    const v = safeText(STATE.meta?.runId) || String(Date.now());
    const res = await fetch(`${pathname}?v=${encodeURIComponent(v)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

async function renderDetails(row) {
  const errorCard = $('errorCard');
  const empty = $('errorEmpty');
  if (!row || classifyStatus(row) !== 'failed') {
    errorCard.hidden = true;
    empty.hidden = false;
    $('detailsMeta').textContent = 'Trykk på en feilet test for detaljer';
    return;
  }

  const branch = safeText(STATE.meta?.branch);
  const sha = shortSha(STATE.meta?.sha);
  const runtime = formatMs(row.responseMs);
  const metaBits = [row.label, runtime].filter(Boolean);
  if (branch) metaBits.push(branch);
  if (sha) metaBits.push(sha);
  $('detailsMeta').textContent = metaBits.join(' • ');
  $('errorTitle').textContent = row.label;
  $('errorTime').textContent = formatDateTime(row.startedAt);

  const err = row.errorText || 'Ukjent feil';
  const selectorLine =
    err
      .split('\n')
      .find((l) => /locator|selector|waiting for|strict mode|element/i.test(l)) || '';
  const combined = selectorLine && !err.includes(selectorLine) ? `${selectorLine}\n\n${err}` : err;
  $('errorMessage').textContent = combined;

  const qa = await loadQaDetails(row.qaDetailsPath);
  const structured = $('errorStructured');
  if (qa) {
    $('qaInput').textContent = prettyJson(qa.input);
    $('qaExpected').textContent = prettyJson(qa.expected);
    $('qaActual').textContent = prettyJson(qa.actual);
    $('qaSlugs').textContent = prettyJson(qa.knowledgeSlugs);
    $('qaBioRules').textContent = prettyJson(qa.biologicalRules);
    $('qaLikelyFiles').textContent = prettyJson(qa.likely_files);
    $('qaPossibleCauses').textContent = prettyJson(qa.possible_causes);
    $('qaRecommendedChecks').textContent = prettyJson(qa.recommended_checks);
    structured.hidden = false;
  } else {
    $('qaInput').textContent = '—';
    $('qaExpected').textContent = '—';
    $('qaActual').textContent = '—';
    $('qaSlugs').textContent = '—';
    $('qaBioRules').textContent = '—';
    $('qaLikelyFiles').textContent = '—';
    $('qaPossibleCauses').textContent = '—';
    $('qaRecommendedChecks').textContent = '—';
    structured.hidden = true;
  }

  const statusEl = $('errorStatus');
  statusEl.textContent = row.status === 'timedout' ? 'TIMEOUT' : 'CRITICAL';
  statusEl.className = `statuspill ${row.status === 'timedout' ? 'statuspill--critical' : 'statuspill--critical'}`;

  const img = $('errorShot');
  const imgLink = $('errorShotLink');
  if (row.screenshotPath) {
    const v = safeText(STATE.meta?.runId) || String(Date.now());
    img.src = `${row.screenshotPath}?v=${encodeURIComponent(v)}`;
    img.hidden = false;
    imgLink.href = img.src;
    imgLink.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
    imgLink.href = '#';
    imgLink.hidden = true;
  }

  const consoleWrap = $('errorConsoleWrap');
  const consolePre = $('errorConsole');
  consoleWrap.hidden = true;
  consolePre.textContent = '';
  if (row.consolePath) {
    try {
      const v = safeText(STATE.meta?.runId) || String(Date.now());
      const res = await fetch(`${row.consolePath}?v=${encodeURIComponent(v)}`, { cache: 'no-store' });
      if (res.ok) {
        const txt = await res.text();
        consolePre.textContent = txt;
        consoleWrap.hidden = false;
      }
    } catch {}
  }

  const videoLink = $('errorVideoLink');
  videoLink.hidden = true;
  videoLink.href = '#';
  if (row.videoPath) {
    const v = safeText(STATE.meta?.runId) || String(Date.now());
    videoLink.href = `${row.videoPath}?v=${encodeURIComponent(v)}`;
    videoLink.hidden = false;
  }

  errorCard.hidden = false;
  empty.hidden = true;
}

function selectRow(id) {
  STATE.selectedId = id;
  const row = STATE.tests.find((t) => t.id === id) || null;
  void renderDetails(row);
}

async function refresh() {
  STATE.meta = await loadMeta();
  const report = await loadReport();
  const rows = report ? buildRowsFromReport(report) : [];
  STATE.report = report;
  STATE.tests = rows;
  renderVersion(STATE.meta);
  renderSummary(report, rows);
  renderSuiteCards(rows);
  renderTable(rows);
  if (STATE.selectedId) selectRow(STATE.selectedId);
  else void renderDetails(null);

  const reportLink = $('reportLink');
  if (reportLink) {
    const v = safeText(STATE.meta?.runId) || String(Date.now());
    if (STATE.meta?.runId) reportLink.href = `reports/playwright-report-${encodeURIComponent(STATE.meta.runId)}/index.html`;
    else reportLink.href = `reports/playwright-report/index.html?v=${encodeURIComponent(v)}`;
  }

  renderHighlights(report, rows);
}

function renderHighlights(report, rows) {
  const wrap = $('highlights');
  if (!wrap) return;

  if (!report) {
    wrap.hidden = true;
    return;
  }

  const v = safeText(STATE.meta?.runId) || String(Date.now());
  const summary = summarizeRows(rows);
  const firstFailWithShot = rows.find((r) => classifyStatus(r) === 'failed' && r.screenshotPath) || null;
  const firstFailWithConsole = rows.find((r) => classifyStatus(r) === 'failed' && r.consolePath) || null;
  const success = summary.failed === 0;

  const failLink = $('latestFailLink');
  if (firstFailWithShot) {
    failLink.textContent = firstFailWithShot.label;
    failLink.href = `${firstFailWithShot.screenshotPath}?v=${encodeURIComponent(v)}`;
  } else {
    failLink.textContent = '—';
    failLink.href = '#';
  }

  const consoleLink = $('latestConsoleLink');
  if (firstFailWithConsole) {
    consoleLink.textContent = firstFailWithConsole.label;
    consoleLink.href = `${firstFailWithConsole.consolePath}?v=${encodeURIComponent(v)}`;
  } else {
    consoleLink.textContent = '—';
    consoleLink.href = '#';
  }

  const latestSuccess = $('latestSuccess');
  latestSuccess.textContent = success ? formatDateTime(report?.stats?.startTime) : '—';

  wrap.hidden = false;
}

function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  const host = location.hostname.toLowerCase();
  const isGitHubPages = host.endsWith('github.io');
  if (isGitHubPages) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }

  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (!isLocalhost) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
  $('refreshBtn').addEventListener('click', refresh);
  registerPwa();
  refresh();
});
