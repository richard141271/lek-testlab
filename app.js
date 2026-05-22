const $ = (id) => document.getElementById(id);

const STATE = {
  report: null,
  tests: [],
  selectedId: null
};

const CANONICAL = [
  { id: 'login', label: 'Login' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'offline', label: 'Offline' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'admin', label: 'Admin' }
];

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
  return { status, duration, error, attachments };
}

function pickCanonical(testTitlePath) {
  const joined = testTitlePath.join(' ').toLowerCase();
  for (const c of CANONICAL) {
    if (joined.includes(`${c.label.toLowerCase()}:`)) return c;
  }
  return null;
}

function buildRowsFromReport(report) {
  const flat = flattenSuites(report);
  const rows = [];

  for (const item of flat) {
    const { spec, titlePath } = item;
    const canonical = pickCanonical(titlePath) || null;
    const { status, duration, error, attachments } = extractLatestResult(spec);
    const loadMs = getMetric(spec, 'loadMs');
    const responseMs = loadMs != null ? loadMs : duration;
    const warningText = getWarning(spec);

    const screenshot = attachments.find((a) => a?.contentType === 'image/png' && typeof a?.path === 'string');
    const screenshotPath = screenshot?.path || null;

    const consoleFile = attachments.find((a) => a?.name === 'console-errors' && typeof a?.path === 'string');
    const consolePath = consoleFile?.path || null;

    const id = canonical?.id || normalizeId(titlePath[titlePath.length - 1] || 'test');
    const label = canonical?.label || titlePath[titlePath.length - 1] || 'Ukjent test';
    const errorText = error?.message || error?.stack || '';

    rows.push({
      id,
      label,
      titlePath,
      status,
      startedAt: report?.stats?.startTime || null,
      responseMs,
      errorText,
      screenshotPath,
      consolePath,
      warning: Boolean(warningText),
      warningText
    });
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  return CANONICAL.map(
    (c) =>
      byId.get(c.id) || {
        id: c.id,
        label: c.label,
        status: 'skipped',
        startedAt: report?.stats?.startTime || null,
        responseMs: null,
        errorText: '',
        screenshotPath: null,
        consolePath: null,
        warning: false,
        warningText: '',
        titlePath: [c.label]
      }
  );
}

function mockReport() {
  const now = new Date();
  return {
    stats: {
      startTime: now.toISOString(),
      expected: 6,
      passed: 4,
      failed: 1,
      skipped: 1,
      flaky: 0
    },
    suites: []
  };
}

async function loadReport() {
  const url = `reports/results.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  } catch (e) {
    return mockReport();
  }
}

function renderSummary(report, rows) {
  const passed = Number(report?.stats?.passed || 0);
  const failed = Number(report?.stats?.failed || 0);
  const skipped = Number(report?.stats?.skipped || 0);
  const flaky = Number(report?.stats?.flaky || 0);
  const warnings = rows.filter((r) => r.warning && String(r.status).toLowerCase() === 'passed').length;

  $('passedCount').textContent = String(passed);
  $('failedCount').textContent = String(failed);
  $('warningCount').textContent = String(skipped + flaky + warnings);
  $('lastRun').textContent = formatDateTime(report?.stats?.startTime);

  const total = rows.length;
  const meta = `${total} tester • ${failed ? 'CRITICAL' : skipped + flaky + warnings ? 'WARNING' : 'OK'}`;
  $('runMeta').textContent = meta;
}

function renderTable(rows) {
  const container = $('testRows');
  container.innerHTML = '';

  for (const row of rows) {
    const r = document.createElement('div');
    r.className = 'table__row table__row--body';
    r.setAttribute('role', 'row');
    r.dataset.testId = row.id;

    const pill = statusToPill(row.status, row.warning);
    const hasError = row.status === 'failed' || row.status === 'timedout';

    r.innerHTML = `
      <div class="table__cell" role="cell">
        <div class="name">${safeText(row.label)}</div>
        <div class="sub mono">${safeText(row.titlePath?.slice(-1)[0] || '')}</div>
      </div>
      <div class="table__cell" role="cell">
        <span class="statuspill ${pill.cls}">${pill.text}</span>
      </div>
      <div class="table__cell mono" role="cell">${formatDateTime(row.startedAt)}</div>
      <div class="table__cell mono" role="cell">${formatMs(row.responseMs)}</div>
      <div class="table__cell mono" role="cell">${hasError ? safeText(row.errorText).split('\n')[0].slice(0, 90) : row.warning ? safeText(row.warningText).slice(0, 90) : '—'}</div>
    `;

    r.addEventListener('click', () => selectRow(row.id));
    container.appendChild(r);
  }
}

async function renderDetails(row) {
  const errorCard = $('errorCard');
  const empty = $('errorEmpty');
  if (!row || (row.status !== 'failed' && row.status !== 'timedout')) {
    errorCard.hidden = true;
    empty.hidden = false;
    $('detailsMeta').textContent = 'Trykk på en feilet test for detaljer';
    return;
  }

  $('detailsMeta').textContent = row.label;
  $('errorTitle').textContent = row.label;
  $('errorTime').textContent = formatDateTime(row.startedAt);
  $('errorMessage').textContent = row.errorText || 'Ukjent feil';

  const statusEl = $('errorStatus');
  statusEl.textContent = row.status === 'timedout' ? 'TIMEOUT' : 'CRITICAL';
  statusEl.className = `statuspill ${row.status === 'timedout' ? 'statuspill--critical' : 'statuspill--critical'}`;

  const img = $('errorShot');
  if (row.screenshotPath) {
    img.src = row.screenshotPath;
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }

  const consoleWrap = $('errorConsoleWrap');
  const consolePre = $('errorConsole');
  consoleWrap.hidden = true;
  consolePre.textContent = '';
  if (row.consolePath) {
    try {
      const res = await fetch(`${row.consolePath}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const txt = await res.text();
        consolePre.textContent = txt;
        consoleWrap.hidden = false;
      }
    } catch {}
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
  const report = await loadReport();
  const rows = buildRowsFromReport(report);
  STATE.report = report;
  STATE.tests = rows;
  renderSummary(report, rows);
  renderTable(rows);
  if (STATE.selectedId) selectRow(STATE.selectedId);
  else void renderDetails(null);
}

function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const isSecure = location.protocol === 'https:' || isLocalhost;
  if (!isSecure) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
  $('refreshBtn').addEventListener('click', refresh);
  registerPwa();
  refresh();
});
