> Historical frontend notes below. Current integrated startup, setup prerequisites and checks are documented in [START_HERE.md](../../START_HERE.md) and [VERIFICATION.md](../../VERIFICATION.md). These historical notes do not describe the current runtime.

# TerraVigil correctness-update verification

Recorded 20 September 2026 for the corrected preferred frontend and regenerated previews. Checks ran on Linux; the Windows instructions were not executed on the user's machine. Historical 2.0/design notes remain separately labeled and do not establish current acceptance.

## Executed checks

| Check                                                | Observed result and scope                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                   | Passed: TypeScript, ESLint, **89 tests in 9 files**, boundary/token/copy/contrast gates, and native Vite live build                                                                                                                                                                                                    |
| Focused map regression coverage                      | **17 tests** cover geometry, late data, chronology, marker size, identity, layers, risk colors, lifecycle options and A/B viewport preservation; included in the full suite                                                                                                                                            |
| `npm run build:all`                                  | Passed: refreshed live `dist/`, synthetic `dist-demo/`, embedded `TerraVigil-preview.html`, artifact checks and standalone startup checks                                                                                                                                                                              |
| Generated artifact/HTTP checks                       | Passed: embedded assets, nine deep links, HEAD, missing-asset 404 and unsupported-method 405                                                                                                                                                                                                                           |
| Standalone DOM harness                               | Passed: Operations startup, Leaflet lifecycle, attribution, demo banner, layer toggle and route picking; JSDOM does not verify canvas drawing or visual layout                                                                                                                                                         |
| Original Express routes with disposable BSON fixture | Passed: 15 unique records, 7 confirmed/8 unconfirmed, 4 HIGH unconfirmed; correct detail identity, unknown telemetry, preserved end-mission location, statistics, polling and explicit unsupported services                                                                                                            |
| Compiled Chromium integration                        | Passed: 15 records; layer counts 7/0/8/15; stored risk counts 8/4/2/1; mission geometry clears; both A/B anchors within 2 pixels; zoom controls do not pick; mission changes reset A/B; assistant makes the scoped request, exposes 404 and clears old conversation; retained pages render; **zero JavaScript errors** |
| Leaflet navigation regression                        | Exact rapid zoom/navigation sequence improved from 6 `_leaflet_pos` errors to 0. The later compiled endpoint drift of 29.5 pixels was corrected and rechecked below 2 pixels                                                                                                                                           |
| Screenshot review                                    | Compiled Live and Risk pages retain the existing design. Public OpenStreetMap downloads were unavailable; tile delivery is unverified                                                                                                                                                                                  |
| `node --check scripts/check-gemini.cjs`              | Passed syntax check                                                                                                                                                                                                                                                                                                    |
| Gemini helper against supplied backend               | Expected nonzero exit with missing-dotenv message; **no provider request or success**                                                                                                                                                                                                                                  |
| Gemini helper redaction check                        | Passed with a mocked SDK: invalid-key failure remains nonzero and categorized; credential and raw provider error are absent. This is not Gemini authentication/generation verification                                                                                                                                 |
| Final ZIP integrity and exclusions                   | Passed: 223 archive entries; ZIP integrity and credential-pattern/exclusion checks. Source, tests and rebuilt previews included; local dependencies, secrets, git and QA state excluded                                                                                                                                |

The release review also reproduced the Windows native-path ESM import failure in the standalone builder. It now resolves the Tailwind configuration through a file URL, including paths with spaces. `npm run build:standalone` and `npm run check:artifacts` passed after this focused correction; an actual Windows execution is still unverified.

The source and compiled browser checks use the integrated Express mission routes with disposable in-memory BSON data. They do **not** connect to real MongoDB or demonstrate a live Gemini account, aircraft, or sensor stream.

## Reproduce local source/build checks

```sh
npm ci
npm run validate
npm run build:all
npm start
```

`npm start` serves the live `dist/` and expects your separate backend. Use `npm run preview:demo` for the compiled synthetic demo. See [README.md](../README.md) for setup and [BACKEND_SYNC.md](../BACKEND_SYNC.md) for the optional local diagnostic.

## Limits and remaining acceptance

- **Live Stage 10 acceptance remains pending.** This archive now includes the RAG backend, `/ask`, Gemini SDK configuration, automatic frontend preparation, source rendering, and mission-isolation contract tests. A real Gemini provider response, real MongoDB run, and grounded supported/unsupported questions still require the operator's local credential and data.
- Real MongoDB integration, persisted authentication/reviews, generated reports/files, field validation of route constraints, actual survey coverage, synchronized sensors, offline recovery and hardware/performance acceptance remain pending.
- Public tile delivery, comprehensive accessibility, mobile/device coverage, and field behavior are not established by these checks. Token contrast checks are not a rendered accessibility audit.
- The build retains the existing Vite warning for a JavaScript chunk over 500 kB and the environment's npm `http-proxy` warning. Neither failed the executed gates. Route-level code splitting remains follow-up work.

See [CHANGES_AND_PENDING.md](CHANGES_AND_PENDING.md) for the SRS amendments and remaining stages.
