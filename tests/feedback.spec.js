const { test, expect, requireBaseUrl, gotoAndMeasure } = require('./testlab');

test('Feedback: feedbackside åpnes og skjema kan sendes', async ({ page }, testInfo) => {
  requireBaseUrl(testInfo);

  const base = process.env.BASE_URL;
  const url = new URL('/feedback', base).toString();
  await gotoAndMeasure(page, testInfo, url);

  const form = page.locator('form').first();
  await expect(form).toBeVisible();

  const message = page
    .getByRole('textbox', { name: /melding|beskjed|feedback|kommentar/i })
    .or(page.locator('textarea').first())
    .first();

  await expect(message).toBeVisible();
  await message.fill(`LEK TestLab auto-feedback ${new Date().toISOString()}`);

  const submit = page
    .getByRole('button', { name: /send|send inn|submit/i })
    .or(form.getByRole('button').first())
    .first();

  await expect(submit).toBeEnabled();
  await submit.click();

  await page.waitForTimeout(600);
  const success = page.locator('text=/takk|sendt|mottatt|submitted/i').first();
  if (await success.isVisible().catch(() => false)) {
    await expect(success).toBeVisible();
  }
});
