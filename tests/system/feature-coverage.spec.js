const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { annotateSuite } = require('../lek/helpers');

const root = process.cwd();
const testsRoot = path.join(root, 'tests');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listSpecFiles(dir, relBase = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.posix.join(relBase, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSpecFiles(abs, rel));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.spec.js')) out.push(rel);
  }
  return out;
}

function normalizeTestRef(ref) {
  const clean = String(ref || '').trim().replace(/\\/g, '/');
  if (!clean) return '';
  if (clean.startsWith('/')) return clean.slice(1);
  if (clean.startsWith('tests/')) return clean.slice('tests/'.length);
  return clean;
}

function resolveTestPath(ref) {
  const rel = normalizeTestRef(ref);
  if (!rel) return { rel: '', abs: '' };
  const abs = path.join(testsRoot, rel);
  return { rel, abs };
}

test('System Health: Feature coverage er komplett og konsistent (features.json)', async ({}, testInfo) => {
  annotateSuite(testInfo, 'system');

  const featuresPath = path.join(root, 'features.json');
  expect(fs.existsSync(featuresPath), 'features.json mangler i repo').toBeTruthy();

  const doc = readJson(featuresPath);
  const features = Array.isArray(doc.features) ? doc.features : [];
  expect(features.length > 0, 'features.json.features er tom').toBeTruthy();

  const ids = features.map((f) => String(f.id || '').trim()).filter(Boolean);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size, 'features.json har dupliserte feature-id').toBe(ids.length);

  const referenced = [];
  const missingFiles = [];
  const requiredMissing = [];

  for (const feature of features) {
    const id = String(feature.id || '').trim();
    const required = Boolean(feature.required);
    const tests = Array.isArray(feature.tests) ? feature.tests : [];
    if (required && tests.length === 0) requiredMissing.push(id);

    for (const ref of tests) {
      const { rel, abs } = resolveTestPath(ref);
      referenced.push(rel);
      if (!abs || !fs.existsSync(abs)) missingFiles.push({ feature: id, test: rel || String(ref) });
    }
  }

  expect(requiredMissing, `Feature coverage incomplete. Required features uten tester: ${requiredMissing.join(', ')}`).toHaveLength(0);
  expect(missingFiles, `Feature coverage incomplete. Refererte testfiler mangler: ${missingFiles.map((m) => `${m.feature}:${m.test}`).join(', ')}`).toHaveLength(0);

  const allSpecs = listSpecFiles(testsRoot).filter((p) => !p.startsWith('system/'));
  const referencedSet = new Set(referenced);
  const unregistered = allSpecs.filter((spec) => !referencedSet.has(spec));
  expect(unregistered, `Feature coverage incomplete. Tester ikke registrert i features.json: ${unregistered.join(', ')}`).toHaveLength(0);
});

