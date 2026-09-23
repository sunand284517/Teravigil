# TerraVigil Frontend Architecture

How data reaches a pixel, and which module is allowed to know what.

## Layers and import direction

Dependencies point one way only:

```
pages / components      presentation — no data access, no env, no fetch
        │
        ▼
      hooks             the only way a component reaches data
        │
        ├──► state      zustand stores: realtime-pushed state + UI state
        │
        ▼
  services/api          REST client, PRD §19.1 (15 routes)
  services/socket       socket.io client, PRD §19.2
        │
        ▼
  services/http         the only module that calls fetch()
  services/dto          wire shapes
  services/mappers      DTO → domain
        │
        ▼
      domain            pure types; imports nothing outside itself
```

`config/` and `lib/` are leaves any layer may import.

### Hard rules

- Nothing under `src/components/**` or `src/pages/**` may import `services/http`,
  `services/dto`, or `services/mappers`. Enforced by `npm run check:boundaries`.
- Components never call `fetch`, never open a socket, and never read
  `import.meta.env`. They use `hooks/`.
- `import.meta.env` is read in exactly one place: `src/config/index.ts`.
- No UI string may say ground is clear, safe, or secure. Enforced by
  `npm run check:copy` (PRD P-20.14).
- No raw hex, arbitrary colour, gradient, blur, or hierarchy shadow in
  components/pages. Enforced by `npm run check:tokens` (§20.4).

## Demo and live modes

`config.dataMode` selects the shared API facade. Live is the production default.
Development explicitly opts into the demo adapter through its environment file.
Demo fixtures and mutations stay in services/demo.ts, never in pages.
The shell renders the permanent SIMULATED DATA notice; no live socket opens in
demo mode. Layer/sidebar preferences persist independently of data mode.

## The backend-contract seam

`services/dto.ts` and `services/mappers.ts` are the only modules that know a
backend field name (PRD P-20.24). Every DTO field is optional, because the wire
is untrusted, and the mappers decide what absence means.

**Absence always maps to `null`, never to a default.** A missing CEP95 radius
becomes `null`, which `lib/formatters.ts` renders as `—`. This is a safety
property, not a style preference: an invented number on a minefield map is
indistinguishable from a measured one. `src/services/mappers.test.ts` guards it.

Two further invariants live in the mappers:

- Risk is stripped from anything not `classification === 'confirmed'`, even if
  the backend sends it. A single sensor is an observation, not a mine (§10).
- A row with no position, no id, or an unrecognised classification is dropped
  rather than rendered half-known.

## Errors

`services/http.ts` converts every failure into a `ServiceError` with a kind:

| Kind | Means | UI response |
|---|---|---|
| `unavailable` | endpoint unset, or 5xx | connection notice + empty states |
| `offline` | network failure or timeout | connection notice + empty states |
| `invalid` | 4xx, or unparseable body | the error text, in place |

`hooks/useConnection` mirrors reachability into the UI store so any component
can report it without importing a service. A 4xx counts as *reachable* — the
backend answered, it just said no.

## Realtime

`hooks/useRealtimeBridge`, mounted once by `AppShell`, holds the app's single
socket subscription. Each inbound event does two things (P-20.18): updates the
Zustand store so the UI moves now, and invalidates the matching TanStack Query
key so the next refetch reconciles against the server rather than trusting the
push. `useLiveTelemetry` is a read-only store selector, so ten components
reading telemetry still mean one socket.

The socket connects lazily on first subscription and disconnects when the last
subscriber leaves.

## State

- **TanStack Query** — all REST reads. Query keys: `['sessions']`,
  `['session', id]`, `['detections', sessionId, filters]`, `['detection', id]`,
  `['coverage', sessionId]`, `['track', sessionId]`, `['reports']`,
  `['system','health']`, `['systemEvents', sessionId]`, `['detectionClasses']`,
  `['me']`.
- **Zustand** — telemetry stream, live detections, layer toggles, sidebar,
  connection status. One store per slice; no cross-store imports.

## Auth

The bearer token lives in `sessionStorage` under `terravigil.auth.token` and is
attached by `http.ts`. A 401 or 403 clears it. Nothing else in the app reads it.

## Demonstration isolation

The demo adapter lives exclusively in `services/demo.ts`. Production uses live
mode by default; the development and dedicated demo environment files opt in.
No frontend page imports synthetic fixtures. Demo state is tab-local, raw sensor
media stays absent, and canned assistant replies are labeled demonstrations.
The application shell exposes the data mode at all times.

In live mode, absent/unavailable values remain absent rather than inheriting
demo records. The map's confirmed point query uses `['riskSurface', sessionId]`
and is invalidated when a detection is pushed or reviewed.
