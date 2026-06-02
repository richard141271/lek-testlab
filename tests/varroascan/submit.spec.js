const { test, expect, openPath } = require('../testlab');

function png1x1Buffer() {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMB9o0oHjYAAAAASUVORK5CYII=';
  return Buffer.from(b64, 'base64');
}

async function goToSubmit(page, testInfo) {
  await openPath(page, testInfo, '/');

  const sendIn = page
    .getByRole('link', { name: /send inn|send inn bilde|send in|submit/i })
    .or(page.getByRole('button', { name: /send inn|send inn bilde|send in|submit/i }))
    .first();

  if (await sendIn.isVisible().catch(() => false)) {
    await sendIn.click();
    await page.waitForLoadState('domcontentloaded');
    return;
  }

  const candidates = ['/send-inn', '/sendinn', '/submit', '/upload'];
  for (const p of candidates) {
    await openPath(page, testInfo, p);
    const input = page.locator('input[type="file"]').first();
    if (await input.isVisible().catch(() => false)) return;
  }

  throw new Error('Fant ikke "send inn"-flyt (link/knapp eller kjent URL).');
}

test('VarroaScan: åpne, gå til send inn, last opp bilde, send inn, verifiser takk', async ({ page }, testInfo) => {
  await goToSubmit(page, testInfo);

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeVisible();

  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: png1x1Buffer()
  });

  const submit = page
    .getByRole('button', { name: /send inn|send|submit|registrer/i })
    .or(page.getByRole('link', { name: /send inn|send|submit/i }))
    .or(page.locator('button[type="submit"]'))
    .first();

  await expect(submit).toBeVisible();
  await submit.click();

  const thanks = page.locator('text=/takk|mottatt|sendt inn|vi har mottatt|success/i').first();
  await expect(thanks).toBeVisible({ timeout: 20_000 });
});

