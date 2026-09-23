# Changes and remaining work

20 September 2026. The preferred uploaded frontend remains the base; its main pages and Hyderabad synthetic demo are preserved. This update corrects behavior within the existing interface. It does not complete the backend or the full SRS.

## Route and sample update — 21 September 2026

- Compute route is connected to a mission-specific backend planner with segment clearance checks for both evidence layers, measured distances, bounded search, and explicit no-route reasons. It does not certify ground clearance, assess terrain, or control an aircraft.
- Scan sessions can initialize/open SAMPLE-TV001 with 4 confirmed detections, 4 unconfirmed observations, 20 GPS points, sample endpoints, and an in-page workflow. Data is labeled synthetic; repeated loading preserves existing edits.
- Follow [START_HERE.md](../../START_HERE.md) to explore and modify the sample. Field validation, survey boundaries, positional uncertainty and autonomous coverage planning remain separate requirements.

## Corrected frontend behavior

- Stable mission/collection/Mongo identities preserve all 15 TV001 snapshot records, including repeated logical IDs. Stored risk remains independent of confirmation: 8 HIGH, 4 MEDIUM, 2 LOW, 1 unknown; 4 HIGH records are unconfirmed.
- Missing live measurements, dates, uncertainty, coverage and altitude datum stay unknown. The UI exposes stored confirmation inconsistencies and uses actual backend statistics.
- Mission creation uses collision-resistant IDs; ending preserves location. Relevant reads poll every 5 seconds with mission isolation. Unsupported login, review, report and health operations cannot claim success.
- Assistant requests are bounded and mission-scoped; conversations reset, late replies cannot cross missions, sources remain traceable, and errors are explicit. No keyword fallback hides provider failure.
- Map fitting, chronology, fixed-size symbols, evidence groups and actual source labels are corrected. Risk is HIGH red, MEDIUM yellow, LOW green independently of confirmation shape. A/B clicks retain their viewport position; manual Fit includes endpoints. HIGH halos are display-only.
- Live development and compiled startup now agree on the Express mission API. Synthetic demo commands remain explicit. Editable source, locked dependency manifests and regenerated previews are provided.

The [verification record](VERIFICATION.md) distinguishes tested fixture behavior from real database, provider and hardware work.

## Amend the SRS before final acceptance

| Existing SRS wording                                                                                  | Required amendment                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SRS 4.3 / REQ-3.4 and section 5.5 discard unconfirmed observations or publish confirmed evidence only | Retain **Layer 1 confirmed** and **Layer 2 unconfirmed** separately. Preserve stored risk, including HIGH unconfirmed observations, and label both layers distinctly in maps and reports |
| Older Flask/SQLite implementation narrative                                                           | Describe the retained React frontend and Express/MongoDB ground station. On-drone SQLite remains a separate edge store if implemented                                                    |
| REQ-1.4 autonomous coverage planning                                                                  | Separate a persisted area-covering flight plan from the current computed A/B advisory ground route. It does not satisfy autonomous coverage-flight planning                                                 |

Confirmation rules, risk thresholds and uncertainty require backend validation and evidence. UI colors or source-status labels do not establish sensor accuracy or field acceptance.

## Remaining stages

| Stage                  | Remaining acceptance                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **10 — live acceptance** | RAG backend, `/ask`, local embeddings, automatic frontend preparation, source citations, typed errors, and mission isolation are integrated and tested offline. Obtain a real Gemini response and mission-scoped retrieval answer with the operator's MongoDB data and private key |
| **11–16**              | Backend retrieval/generation contracts and frontend source/error rendering are implemented; complete live supported/unsupported-question checks and review thresholds against the operator's data |
| **17–19**              | Assistant auto-prepares the selected mission, enforces bounded timeouts, resets on mission changes, and renders grounded sources; live MongoDB/Gemini end-to-end acceptance remains pending |
| **20**                 | Generate real PDF/CSV reports from deterministic MongoDB facts with grounded narrative, durable sources and verified downloads                                                                                               |
| **21–22**              | Backend indexes, idempotency, validation, access control, secret protection, configured CORS and appropriate rate limits                                                                                                     |
| **23–25**              | Backend regressions, frontend interactions and the full local demonstration, including unsupported questions, database/link loss, persisted operations and report downloads                                                  |

## Other full-SRS work still needed

| Requirement area                           | Evidence or implementation still needed                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-1.1–1.5: operator and mission workflow | Real authentication/roles; persisted survey polygons and validated mission parameters; autonomous coverage plan and flight-controller integration |
| REQ-2.1–2.5: edge vision                   | Target-hardware camera/inference/autonomy, real bounding boxes/classes/images/profile identifiers, and persisted confidence-threshold behavior    |
| REQ-3.1–3.5: fusion                        | Time-aligned sensor/GPS provenance, validated dual confirmation, time/spatial association and measured uncertainty                                |
| REQ-4.1–4.4: storage and recovery          | Complete schema/media access, required telemetry, persistent edits/reviews and archives, edge buffering/retry/reconciliation                      |
| REQ-5.1–5.5: outputs                       | Actual downloadable reports, defined risk surface, real live alerts/freshness, grounded assistant and backend-validated historical analytics      |
| Quality/security/performance sections      | Roles/TLS, recovery, hardware testing and measured latency, accuracy and recall                                                                   |

Newer local backend or hardware work may already exist; its code, logs or demonstrations are needed before assessing it. No later stage is marked complete by this frontend package. See [BACKEND_SYNC.md](../BACKEND_SYNC.md#stage-10-gemini-check) for the private local diagnostic.
