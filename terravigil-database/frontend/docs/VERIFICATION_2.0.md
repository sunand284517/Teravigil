> Historical record from the uploaded 2.0 archive; original results and limits are retained below. These do not verify the current source, configuration, browser behavior, or package. See [VERIFICATION.md](VERIFICATION.md) for the 20 September 2026 correctness update.

# TerraVigil 2.0 verification

Final source and generated outputs were checked on 14 September 2026. TypeScript, ESLint, the project policy checks, and 26 tests passed. The interface was not rendered in a browser in this authoring environment; desktop/mobile appearance and browser interactions remain unverified.

## Completed checks

| Check                                  | Result    | Scope                                                                                                                                                                                    |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                    | Pass      | Strict TypeScript across final source, including the six new demo tests                                                                                                                  |
| `npm run lint`                         | Pass      | Final application source; generated builds are excluded                                                                                                                                  |
| `node scripts/check-boundaries.mjs`    | Pass      | No service seam or fixture imports in pages/components                                                                                                                                   |
| `node scripts/check-tokens.mjs`        | Pass      | Semantic tokens and separation of chrome from instrument styling                                                                                                                         |
| `node scripts/check-copy.mjs`          | Pass      | Project forbidden-copy rules                                                                                                                                                             |
| `node scripts/contrast-audit.mjs`      | Pass      | Every gated token contrast pair; this is not a rendered-page accessibility audit                                                                                                         |
| Existing domain/formatter/mapper tests | 20 passed | Original test files and assertions, run through the fallback runner described below                                                                                                      |
| New `src/services/demo.test.ts`        | 6 passed  | Actual demo service integration checks, run through the same fallback runner                                                                                                             |
| Live and demo asset bundles            | Pass      | Full application compiled/minified with esbuild and the project Tailwind/PostCSS/Autoprefixer configuration                                                                              |
| Standalone demo HTML                   | Pass      | Portable build script executed, hash routing adaptation confirmed, JS syntax parsed, CSS directives expanded, all 37 font references embedded, no external CSS asset URLs or script tags |
| Dependency-free preview server         | Pass      | 16 SPA/deep-link responses, three static assets, missing asset 404, unsupported POST 405, path traversal 403; HTTP serving only                                                          |

## Test execution

The upload contained Windows npm executables and Windows-only Rollup optional binaries. Local npm executable links were repaired. The Linux Rollup native package remained unavailable, and an ordinary npm registry request was denied by the environment. Consequently, the native Vite build and Vitest CLI could not start here.

The actual four test files were bundled for Node and executed with Node's test runner. A temporary adapter mapped Vitest `describe`/`it` to Node's equivalents and implemented the six assertion matchers used by the original tests with Node's strict assertions. All 26 tests passed; none were skipped. This is a fallback execution of the source assertions, not a successful native Vitest run. The original 20 tests were unchanged. The six new service tests are preserved with normal Vitest imports for `npm test` after a normal dependency installation.

The new service checks cover:

- Confirmed versus single-sensor evidence, null risk on unconfirmed records, and risk-surface filtering.
- Clone isolation and append-only review history without changing sensor evidence or risk.
- Report metadata snapshots, actual counts, and absence of invented download media.
- The nine undersampled telemetry samples in the demo track.
- Unavailable routing and absence of invented AI citations or SQL.
- Creation and ending of empty local sessions without seeded telemetry leaking into them.

## Generated deliverables

`dist/` uses live mode with no backend configured. `dist-demo/` explicitly uses synthetic demo mode. Both contain normal BrowserRouter output and require an HTTP server with SPA fallback; the included `scripts/serve-preview.mjs` provides that.

The separately delivered `TerraVigil-preview.html` embeds the complete application, CSS, fonts, and favicon. It explicitly uses synthetic demo data and adapts BrowserRouter to HashRouter only during this standalone build. The source application's router is unchanged. The portable script writes this file in the project root by default:

```sh
npm ci
npm run build:standalone
```

The supplied bundles were generated with an available local esbuild 0.28.0 binary because the uploaded native dependencies could not run. They use the project's actual CSS pipeline and source. The standard source build remains Vite, using the dependency versions in the lockfile after `npm ci`:

```sh
npm run validate
npm run build:demo
npm run preview:demo
```

The standalone builder itself was executed from the delivered script; only its esbuild package resolution was redirected to the available local binary for this authoring run. It contains no absolute authoring-workspace paths.

## Practical limits

The supported cloud browser rejected local and shared-file page navigation under its URL policy. No workaround was attempted after the explicit policy block. There are no claimed browser screenshots, 1440 × 900/390 × 844 render checks, browser interaction results, or end-to-end accessibility results. Responsive layouts, focus behavior, and interaction wiring received source review only.

No backend, aircraft, sensor, routing engine, report generator, model, or standards-retrieval service was supplied for integration testing. Live connectivity and those backend-dependent operations remain unverified. The standalone demo labels synthetic records explicitly and preserves unavailable states for real imagery, route computation, verified standards citations, and generated report files.
