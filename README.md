# LEK TestLab

LEK TestLab er et lett og visuelt QA-/testsystem for LEK-Biens Vokter™. Systemet kjører Playwright-tester i GitHub Actions, genererer rapporter, tar screenshots ved feil og publiserer et dashboard via GitHub Pages.

## Hva som skjer i praksis

- GitHub Actions kjører Playwright
- Resultat lagres i `reports/results.json` (maskinlesbart)
- HTML-rapport lagres i `reports/playwright-report/`
- Ved feil lagres:
  - screenshot i `screenshots/`
  - console errors i `reports/console/`
- GitHub Pages publiserer `index.html` + `reports/` + `screenshots/`

Dashboardet (`index.html`) leser `reports/results.json` og viser PASS/FAIL, responstid (loadMs) og siste kjøring. Ved feil kan du klikke på en test og se screenshot + console errors.

## Staging / Production

Standard BASE_URL er satt til staging:

- `https://staging.lekbie.no`

Du kan override i GitHub:

- Actions → Settings → Secrets and variables → Actions → Variables
  - `BASE_URL` (hvis satt brukes alltid)
  - `PROD_BASE_URL` (brukes på `production`-branch hvis `BASE_URL` ikke er satt)

## Miljøvariabler (login)

Hvis appen krever login, brukes:

- `LEK_EMAIL`
- `LEK_PASSWORD`

I GitHub Actions skal disse ligge i Secrets.

## Kjør lokalt

Installer:

```bash
npm install
npx playwright install chromium
```

Kjør tester mot staging (default):

```bash
npm test
```

Kjør med egne verdier:

```bash
BASE_URL="https://staging.lekbie.no" LEK_EMAIL="..." LEK_PASSWORD="..." npm test
```

Åpne Playwright HTML-rapport:

```bash
npm run report
```

## Tester (MVP)

Testene ligger i `tests/`:

- `login.spec.js`
- `dashboard.spec.js`
- `scanner.spec.js`
- `feedback.spec.js`
- `offline.spec.js`
- `admin.spec.js`

Felles hooks og helpers ligger i `tests/testlab.js`:

- måler responstid (`loadMs`)
- tar screenshot ved feil (lagres i `screenshots/`)
- samler console errors ved feil (lagres i `reports/console/`)

## Legg til nye tester

1. Lag en ny fil i `tests/` med suffix `.spec.js`, f.eks. `settings.spec.js`
2. Bruk samme mønster som de andre testene:
   - `ensureOnPage(page, testInfo, '/path')` for auth + måling
   - bruk tilgjengelige selektorer (roller/labels/data-testid)
3. Dashboardet plukker automatisk opp resultatene via `reports/results.json`

## Automatikk i GitHub Actions

Workflow: `.github/workflows/test.yml`

- kjører ved push til `main`, `staging`, `production`
- kjører nightly (cron)
- kan startes manuelt via Actions (workflow_dispatch)

GitHub Pages deploy skjer fra `main`.
