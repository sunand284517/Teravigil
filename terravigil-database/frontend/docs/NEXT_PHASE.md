> Historical PRD integration notes, retained below. The current default uses the Express `missions` adapter; it preserves stored unconfirmed risk. Older confirmed-only mapper rules and endpoint assumptions below are not the current mission contract. See [CHANGES_AND_PENDING.md](CHANGES_AND_PENDING.md) and [BACKEND_SYNC.md](../BACKEND_SYNC.md).

# Next Phase

What the frontend now needs from the backend, and what is deliberately not built
yet. The dashboard is wired to the PRD §19 contract. An explicit demo adapter
now exercises the interface with synthetic records; the endpoints below remain
necessary for live operation.

## Blocking: endpoints the UI already calls

Each of these is implemented client-side in `services/api.ts` and will populate
the UI when valid authenticated responses arrive. Field names are in `services/dto.ts`.

| Route                                     | Method            | Populates                                        |
| ----------------------------------------- | ----------------- | ------------------------------------------------ |
| `/auth/login`, `/auth/logout`, `/auth/me` | POST / POST / GET | sign-in, operator name in the top bar            |
| `/sessions`                               | GET, POST         | session archive, active session                  |
| `/sessions/:id`, `/sessions/:id/end`      | GET, POST         | session detail                                   |
| `/detections`                             | GET               | register, live feed, map markers                 |
| `/detections/:id`                         | GET               | detection detail                                 |
| `/detections/:id/review`                  | POST              | append-only endorse/dispute                      |
| `/sessions/:id/track`                     | GET               | sweep ribbon, flown track                        |
| `/sessions/:id/coverage`                  | GET               | every swept-area readout                         |
| `/sessions/:id/risk-surface`              | GET               | confirmed-only risk layer                        |
| `/route/minimum-risk`                     | POST              | route planner                                    |
| `/assistant/query`                        | POST              | doctrine copilot                                 |
| `/reports`, `/reports/:id`                | GET, POST         | report archive                                   |
| `/system/health`, `/system/events`        | GET               | health matrix, event log, reachability heartbeat |
| `/catalog/detection-classes`              | GET               | every class label in the UI                      |

Socket events (`services/socket.ts`): `telemetry`, `detection`, `alert`,
`coverage`.

## Fields the UI wants that the PRD does not yet specify

- `TrackPoint.linkQualityPercent` — the live console shows radio link quality. Without
  it that readout stays an em-dash. Previously this was a hardcoded `94`.
- `Detection.bestMetalStandoffM` — coil standoff at the strongest metal hit,
  shown against `config.metalMaxStandoffM` on the detection detail page.
- `CoverageSummary.visualSwathM` — derived swath width at the flown altitude.
- `Detection.gradCamUrl` — the explanation overlay is opacity-controlled but has
  nothing to draw until this exists.

## Server-side responsibilities the client deliberately does not simulate

- **Assistant refusals.** The client no longer fakes an IMAS refusal. Whether a
  question may be answered is a policy decision that belongs on the server; the
  client renders `refused`/`refusalReason` when told.
- **Detection filtering.** Filters are sent as query parameters. Filtering
  client-side would silently limit results to whatever page one happened to load.
- **Risk scoring.** Computed server-side and audited client-side. The mappers
  refuse a risk band on any non-confirmed row.

## Deferred UI work

1. **Imagery integration** — supply detection thumbnails and post-flight full-resolution evidence. Live video is outside the current MVP under PRD §2.2 and §7.4; do not treat transport selection as an approved frontend task.
2. **Offline basemap imagery** — the map is functional without tiles (local
   graticule + scale bar), but a packaged raster/vector tile set for the actual
   survey areas is still needed if operators want terrain under the detections.
   Public CDNs are not an option: no internet in the field, and several now
   require an API key.
3. **Route export** — the GeoJSON button is disabled pending an export endpoint
   (which must be role-gated and audit-logged, P-23.14).
4. **Coverage rendering** — `CoverageSummary` numbers are shown, but the
   per-cell `visual_swept` / `dual_swept` grid is not drawn on the map yet. Needs
   a tiled or canvas layer (P-12.8).
5. **Replay is implemented** — SessionDetailPage has a time scrubber driving the displayed track, current point, and observations. Validate it against recorded backend data.
6. **Aggregate analytics** — cross-session totals are derived from the session
   and detection lists. A server-side aggregate endpoint would make Analytics
   correct over more than one page of history.
7. **Pagination contract** — the detection register paginates its fetched rows locally. Server cursor pagination is still required before claiming completeness over large datasets (P-22.6 targets 100 sessions).
8. **Code splitting** — the app currently ships a single application JavaScript bundle. Route-level lazy loading remains a performance follow-up; check current build output rather than relying on the old bundle size.

## Open questions for the backend team

1. Response envelope: bare arrays (assumed today) or `{ data, meta }`?
2. Auth: bearer token in the socket handshake — confirm the expected shape.
3. Are detection `classId` values stable across model checkpoints? The UI joins
   them against `/catalog/detection-classes`.
4. Does `/detections` accept `sessionId` plus the filter parameters listed in
   `DetectionFilters`, and what is its ordering guarantee?
5. Retention and export scope: per-session or all-session; who may download.
6. Roles: what may an `analyst` do that an `operator` may not? The UI does not
   gate anything by role yet.

## Non-goals

Any vehicle command authority (arm/disarm, takeoff, land, RTL, waypoint upload),
any ordnance interaction, any claim of land release, and any client-side
simulation of backend data.
