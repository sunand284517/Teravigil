# TerraVigil integrated application

Version 3.0 connects the supplied trained detector, a persistent mission store, real mission RAG and PDF/CSV reporting to the existing React dashboard. Follow **START_HERE.md** to install and run it.

## Commands

| Command from application root | Purpose |
| --- | --- |
| `npm run setup` | Install backend and CPU Python runtime; preserve existing settings/data |
| `npm start` | Serve the integrated application and API at http://localhost:3000 |
| `npm run doctor` | Verify storage, actual model execution, embeddings and configured Gemini access |
| `npm run setup:model` | Install/repair only the local Python inference environment |
| `npm run setup:dev` | Install all dependencies and rebuild frontend |
| `npm run build` | Rebuild the frontend after editing source |
| `npm test` | Backend and frontend suites, after installing frontend dev dependencies |

The prebuilt UI is included. Do not open frontend HTML directly to run the application. `npm start` is the supported entry point. The default binds to loopback only; this package is a local operator application, not a public deployment with production authentication.

## Architecture and storage

The Node backend serves `/api` and the frontend on one origin. It uses a local persistent collection store in `backend/data/missions.json`. Uploaded images, annotated outputs and immutable report editions live beside it under `backend/data`. Back up the **entire** data directory together; JSON alone does not include images and report bytes. One backend process should own a local data directory. Do not synchronize a live writable data folder between multiple processes.

The sample mission is inserted idempotently on first use. Its source records remain read-only, but its retrieval indexes and report editions are real. Uploading an image while the sample is selected creates a separate inference mission. New missions and reports survive restart.

For optional MongoDB set `TERRAVIGIL_DB=mongodb`, `MONGODB_URI` and `MONGODB_DATABASE` in `backend/.env`. Keep `TERRAVIGIL_DATA_DIR` on durable storage for images/reports. No separate MongoDB installation is needed in the default local mode.

## Detection model

`inference/weights/best.pt` is byte-identical to `train-2/weights/best.pt` in the supplied training archive. SHA256: `02d9b7eac5d7bbd33e0b8168ea892f24da6099b1fc02e9c87c688b928a464f93`.

The Python CLI loads that checkpoint using Ultralytics 8.4.157 and returns real bounding boxes, class labels, confidence scores, normalized centers and an annotated JPEG. CPU is the default. Setup installs torch 2.8.0 and torchvision 0.23.0 CPU wheels on Windows/Linux; the pinned runtime was exercised on Linux/Python 3.12. Windows launcher logic is supplied but was not executed on Windows here.

The checkpoint has 13 classes; `land_mines` is class 12. Every model output is stored in an inference run. Geolocated land_mines outputs are additionally stored as **UNCONFIRMED** observations. A supplied image coordinate is labeled as an image location, not a measured target coordinate. No GPS, metal signal, flight telemetry or confirmation is fabricated. Model inference accepts still images; the archive does not supply a validated drone camera/MAVLink control integration.

`INFERENCE_PYTHON` can point to another configured Python executable. `INFERENCE_DEVICE=cpu` is the tested default. A separate GPU/Jetson environment needs compatible device-specific packages; this setup does not export or benchmark TensorRT.

## Assistant and retrieval

The integrated app uses the supplied sample and stored mission records through the same RAG service. MiniLM performs real semantic embeddings; explicit record IDs also use exact retrieval. Responses receive mission-scoped records, full-mission summary facts and source citations. Image-only inference runs remain queryable. Project-reference snippets are labeled paraphrases of the supplied SRS/training material, not external clearance doctrine.

The MiniLM model cache is bundled in `backend/.cache/transformers`. Its first runtime initialization occurs when a mission is prepared. Indexes refresh after source changes. Gemini is called through its actual HTTPS generateContent API, with the key stored only in `backend/.env`. Missing credentials, provider rejection, quota/timeouts and embedding failures produce visible errors. Nothing switches to deterministic sample chat in the default app.

Gemini still requires your own working API key, project access, model availability and internet. No working key was supplied for this build, so authenticated Gemini generation could not be verified. The request/response transport and error handling were tested without using a real account.

## Reports

Reports contain frozen source records, confirmed-only risk totals, separate unconfirmed observations, image inference outputs, telemetry, source references, limitations and content/file hashes. PDFs include readable summaries and raw source appendices. CSVs preserve rows and guard spreadsheet formula cells. Download integrity is checked against the stored hashes. Each report is a new edition; an earlier edition is not overwritten by later data changes.

Factual reports work without a model provider. Selecting an AI narrative performs genuine RAG generation and cites the sources used; a provider failure stops that requested AI report instead of silently substituting a fabricated narrative. Imagery references point to retained evidence files; external image URLs are not automatically downloaded into PDFs.

## Routes and live records

**Flight start/Flight end** delimit the recorded telemetry path. **Route A/Route B** delimit a separate computed advisory route. The algorithm excludes stored evidence points and honors its bounded standoff calculation. Satellite imagery is a basemap; it does not make the algorithm aware of buildings, terrain or unknown hazards.

Legacy mission/detection/telemetry CRUD and fusion endpoints remain available at `/api` and compatible root API paths. Directly supplied sensor records are stored as provided; the application cannot authenticate physical sensor evidence. This software is not a clearance certificate or an autonomous flight controller.

## Development

After `npm run setup:dev`, run the backend with `npm start` and optionally `npm --prefix frontend run dev` for the Vite UI on port 5173. Its `/api` proxy targets port 3000. Rebuild with `npm run build` before using the packaged UI again. Change PORT only for served production-style use or update the development proxy to match.

See VERIFICATION.md for measured checks and inference/README.md for the model contract. Third-party notices are in THIRD_PARTY_NOTICES.md and the report font license.
