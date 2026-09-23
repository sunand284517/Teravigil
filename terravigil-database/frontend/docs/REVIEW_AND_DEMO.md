> Historical frontend notes below. Current integrated startup, setup prerequisites and checks are documented in [START_HERE.md](../../START_HERE.md) and [VERIFICATION.md](../../VERIFICATION.md). These historical notes do not describe the current runtime.

# Review and presentation guide

## Why index.html did not open

The uploaded root `index.html` points to `/src/main.tsx`. That is a TypeScript/JSX module entry for Vite, not standalone browser JavaScript. When opened as `file://`, root-relative paths point outside the project and the browser cannot perform Vite's transformation. A generic static server is also insufficient for the source TSX.

The uploaded `dist/index.html` and `dist-demo/index.html` pointed to root-relative compiled assets and used BrowserRouter. These need HTTP serving plus a history fallback for direct route navigation. The standalone file instead embedded the application and adapted the router to hashes.

In 2.1, double-clicking the root source index opens the adjacent standalone demo. Development HTTP behavior is unchanged. The Vite build removes this shortcut so a live distribution cannot silently change to synthetic data. A visible launch message remains if the app cannot start. The supplied preview server handles SPA deep links.

Vite documents that index.html belongs to its source module graph: [Vite guide](https://vite.dev/guide/).

## What is the original thing?

There is one frontend application, with two data adapters and several packaging formats. `src/` is the editable source. `TerraVigil-preview.html` is a compiled copy of that same frontend, explicitly using the synthetic adapter and hash routes. It is not a separately designed or separately maintained product.

The new briefing is a route inside the same application. The standalone now opens Operations and its Leaflet map first; both the briefing and the working Operations UI are available from the source app and compiled builds.

According to PRD sections 1–4, the intended complete TerraVigil system brings together aerial visual observations, a separate metal-confirmation pass, location uncertainty, geospatial review, and ground-station decision support. The supplied frontend is the operator-facing M14 part. It does not demonstrate that the hardware, model, fusion engine, backend, or field acceptance criteria are complete.

## What the scan found

| Finding                                                                  | Action / current status                                                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Root source index opened as a raw file                                   | Added a file shortcut to the embedded preview and startup guidance                                                   |
| Compiled builds need HTTP and route fallback                             | Included `npm start` and retained the dependency-free SPA server                                                     |
| Standalone builder relied on transitive esbuild                          | Added an exact direct development dependency                                                                         |
| Requested GSAP was absent                                                | Added GSAP 3.13.0, a briefing, finite introduction, scroll reveals, workflow transitions, and reduced-motion cleanup |
| Operations needed stronger visual hierarchy                              | Added an editorial heading, clearer action group, and unified metric strip                                           |
| Prior verification admitted no browser rendering                         | Retained that historical record; current verification also states the actual browser limitation                      |
| NEXT_PHASE listed replay and pagination as missing                       | Corrected those entries: replay and pagination of the fetched register are present                                   |
| Route export, real media, reports, and cited assistant depend on backend | Retained explicit unavailable/demo states                                                                            |
| No backend or hardware was supplied                                      | Live end-to-end validation remains open                                                                              |

## A three-minute demo

1. **Project briefing — 30 seconds.** Open the standalone HTML, then choose Project briefing from navigation. Explain: “TerraVigil brings aerial observations and independent metal evidence into one review workspace.” Use the workflow tabs to explain why a visual candidate remains distinct from confirmed evidence.
2. **Operations — 30 seconds.** Click “Explore the workspace.” Point out the synthetic-data label, selected session, confirmed versus single-sensor observations, sampling, and instrument status.
3. **Live console — 30 seconds.** Show the recorded survey context, map layers, and sweep ribbon. Say this is a demonstration snapshot, not a live aircraft feed.
4. **Detections — 45 seconds.** Open an observation and compare visual confidence, metal signal, review history, and stated localization uncertainty. Do not present classification confidence as ground release.
5. **Risk map and reports — 45 seconds.** Toggle evidence layers, explain the separate confirmed-risk treatment, then show report metadata. Explain that actual route results, source media, generated PDFs, and cited assistant responses require the connected services.

Finish with the product boundary: “This is a working frontend demonstration of survey intelligence. The complete system needs the hardware and backend connected and validated.”

## UI and motion decisions

The user requested a stronger interface and GSAP effects. The new presentation surface therefore uses a larger typographic scale, a wireframe illustration, finite staged motion, and scroll reveals. It is explicitly a concept presentation, with no sensor readings hidden inside the illustration.

The operational workspace retains the PRD's stable-readout requirements: only static headings receive a 140 ms transition. No animated count-up, marker scanning, fabricated map geometry, or animated telemetry arrival was added. Reduced-motion preferences disable GSAP motion; the presentation also has a pause control. Context and media-query cleanup follow GSAP's documented lifecycle patterns: [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) and [GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/).

## Before presenting on your device

Extract the ZIP, open the standalone, check the briefing and workspace, resize once to your projector resolution, and try a detection and a layer toggle. If your browser restricts file storage, use `npm start` instead. After source edits, run `npm run build:all`; an old standalone does not update itself.
