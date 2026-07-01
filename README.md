# LEK TestLab

LEK TestLab er et lett og visuelt QA-/testsystem som kan teste flere apper (targets) i samme repo. Systemet kjører Playwright-tester i GitHub Actions, genererer rapporter, tar screenshots ved feil og publiserer et dashboard via GitHub Pages.

## Hva som skjer i praksis

- GitHub Actions kjører Playwright
- Resultat lagres i `reports/results.json` (maskinlesbart)
- HTML-rapport lagres i `reports/playwright-report/`
- Ved feil lagres:
  - screenshot i `screenshots/`
  - console errors i `reports/console/`
- GitHub Pages publiserer `index.html` + `reports/` + `screenshots/`

Dashboardet (`index.html`) leser `reports/results.json` og viser PASS/FAIL, responstid (loadMs) og siste kjøring. Ved feil kan du klikke på en test og se screenshot + console errors.

## Targets (apper)

Targets er definert i [targets.json](file:///Users/jornsmackbookpro/Documents/trae_projects/lek-testlab/targets.json):

- `lek` (LEK-Biens Vokter)
- `varroascan` (LEK-VarroaScan)
- `all` (begge)

Playwright kjører prosjekter per target (project name), og rapporten samler alt i samme `results.json`.

## Staging / Production (URLs)

BaseURLs kommer fra GitHub Secrets:

- `LEK_STAGING_URL`
- `VARROASCAN_STAGING_URL`
- (valgfritt senere) `LEK_PROD_URL`, `VARROASCAN_PROD_URL`

Workflow setter disse til:

- `LEK_BASE_URL`
- `VARROASCAN_BASE_URL`

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

Kjør default target (LEK):

```bash
npm test
```

Kjør alle targets:

```bash
TARGET="all" LEK_BASE_URL="https://staging.lekbie.no" VARROASCAN_BASE_URL="https://..." LEK_EMAIL="..." LEK_PASSWORD="..." npm test
```

Kjør bare LEK:

```bash
TARGET="lek" LEK_BASE_URL="https://staging.lekbie.no" LEK_EMAIL="..." LEK_PASSWORD="..." npm test
```

Kjør bare VarroaScan:

```bash
TARGET="varroascan" VARROASCAN_BASE_URL="https://..." npm test
```

Åpne Playwright HTML-rapport:

```bash
npm run report
```

## Tester

Testene ligger i:

- `tests/lek/**` (LEK)
- `tests/varroascan/**` (VarroaScan)
- `tests/system/**` (System Health)

Felles hooks og helpers ligger i `tests/testlab.js`:

- måler responstid (`loadMs`)
- tar screenshot ved feil (lagres i `screenshots/`)
- samler console errors ved feil (lagres i `reports/console/`)

## Legg til nye tester

1. Lag en ny fil i riktig mappe med suffix `.spec.js`
   - LEK: `tests/lek/<navn>.spec.js`
   - VarroaScan: `tests/varroascan/<navn>.spec.js`
2. Bruk samme mønster som de andre testene:
   - `ensureOnPage(page, testInfo, '/path')` for auth + måling
   - bruk tilgjengelige selektorer (roller/labels/data-testid)
3. Dashboardet plukker automatisk opp resultatene via `reports/results.json`

## Feature Registry og Definition of Done (DoD)

`features.json` er kilden til sannhet for hva som må være testet. Den brukes av systemtesten `tests/system/feature-coverage.spec.js` til å sikre:

- ingen features kan glemmes (required features må ha tester)
- alle refererte testfiler finnes
- ingen `.spec.js`-tester ligger “løst” uten å være registrert i `features.json`

En feature regnes ikke som ferdig før:

- koden fungerer
- workflow er grønn
- Playwright-test finnes
- feature er registrert i `features.json`
- relevante user journeys er oppdatert
- ved bugfix: regression-test er opprettet og blir værende

## Automatikk i GitHub Actions

Workflow: `.github/workflows/test.yml`

- kjører ved push til `main`, `staging`, `production`
- kjører nightly (cron)
- kan startes manuelt via Actions (workflow_dispatch) med target dropdown

GitHub Pages deploy skjer fra `main`.
