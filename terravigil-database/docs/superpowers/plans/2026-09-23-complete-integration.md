# TerraVigil Integration Implementation Plan

> For agentic workers: use focused parallel implementation tasks with disjoint file ownership and final independent review.

**Goal:** Deliver an updated ZIP with working inference, RAG wiring and PDF/CSV reporting.
**Architecture:** Existing React and Express application, default persistent local collection store with optional MongoDB, Python model subprocess, existing MiniLM/Gemini pipeline, report snapshot service.
**Tech Stack:** Node 22.12+/24, React/Vite/TypeScript, Ultralytics/Python 3.10-3.12, PDFKit.
**Spec:** ../specs/2026-09-23-complete-integration.md

## Global Constraints
- Preserve supplied model bytes and mark sample data synthetic.
- Do not ship credentials or test/runtime data; fail explicitly on missing external dependencies.
- Backend serves frontend/dist and /api on one origin by default.
- Add tests for behavior changes and run builds before packaging.

## Review Focus
- Fresh extraction on Windows: paths with spaces and Python environment discovery.
- No Gemini key/network: assistant surfaces unavailable; factual reports remain downloadable.
- Persistence/restarts and concurrent report requests: stable mission IDs and unique immutable editions.
- Invalid images, GPS pairs and IDs: no traversal, fake confirmations or partial writes.
- Stale RAG indexes, empty missions and unrelated questions: refresh, correct scope and honest answers.

## Task 1 Persistent integrated runtime and RAG
Owner root. Files backend/local-db.js, database.js, server.js, integrated.js, rag/*, scripts/*, package.json, docs.
- Add failing tests for persistence, sample index bypass, missing-key errors and genuine retrieval against seeded records.
- Implement a disk-backed collection API compatible with existing routes, atomic replacement and supported query operators.
- Seed sample idempotently, remove sample interception from integrated default, route /api and direct API paths consistently.
- Mount report and inference routers before legacy endpoints. Expose health and source capabilities.
- Refresh RAG on ask and preserve evidence/provenance. Verify tests and startup.

## Task 2 Model inference
Owner model worker. Own inference/**, backend/inference/**, backend/test/inference.test.cjs only.
Interface createInferenceRouter({getDB,dataDir}) from backend/inference/routes.js. Endpoints GET /inference/status; POST /inference/predict JSON {imageBase64,filename,missionId?,confidence?,latitude?,longitude?}; GET /inference/files/:filename. Response {runId,missionId,model,predictions,imageUrl,annotatedImageUrl,persistedObservations}. Predictions {classId,className,confidence,bbox:[x1,y1,x2,y2],normalizedCenter:{x,y}}.
- Add failing tests for validation/no implicit confirmation/subprocess failure and persisted real output contract.
- Implement Python inference CLI, bundled checkpoint with checksum, documented requirements and launch discovery.
- Return genuine per-image results; persist geolocated landmine observations only, retaining actual model metadata.
- Verify Python unit tests and actual best.pt prediction if dependencies install.

## Task 3 Report service
Owner report worker. Own backend/reports/**, backend/test/reports.test.cjs and backend/package*.json only (PDFKit dependency).
Interface createReportRouter({getDB,ragService,dataDir}) from backend/reports/routes.js. GET /reports and /reports/:id; POST /reports {sessionId,includeAi?:boolean}; GET /reports/:id/download?format=pdf|csv. Returns ReportItem camelCase matching frontend domain, plus csvDownloadUrl, generationMode, narrative, narrativeError, sources, synthetic. Download URLs root /api/reports/... . Default factual report; explicit includeAi request must call real ragService and expose failure clearly.
- Add failing tests for PDF/CSV bytes, correct mission totals, missing mission, immutable editions and hostile CSV cells.
- Freeze source snapshot, create human readable PDF/CSV and durable metadata, unique editions under concurrency.
- Test service through actual HTTP and parse/render sample PDF.

## Task 4 UI integration
Owner frontend worker. Own frontend/src/** and frontend/.env* and frontend/vite.config.ts only.
- Wire mission report methods and downloads to new report endpoints; allow factual/AI report selection.
- Replace misleading sample-assistant copy: sample describes data provenance, readiness describes actual indexing/LLM.
- Add model inference page using Task 2 interface with upload/threshold/optional GPS, errors, bounding boxes/annotated image and mission link; app accepts backend API-prefixed URLs.
- Wire real subsystem status through GET /system/health (array SubsystemHealth), events /system/events, class catalog /classes.
- Relabel flight START/END and route A/B clearly. Use /api same-origin defaults and Vite proxy.
- Add focused frontend regressions and run test/typecheck/build.

## Task 5 Verification and delivery
Owner root plus fresh reviewer.
- Review task outputs and full integration, run backend/frontend/Python suites, browser smoke and actual model inference.
- Include setup/doctor commands, prebuilt UI and best.pt; remove stale preview artifacts, old promises, test data, node_modules, venvs and secrets from deliverable.
- Create ZIP with one application root. Save updated file and provide concise setup plus verified limitations.
