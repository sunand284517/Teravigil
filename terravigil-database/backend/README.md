# TerraVigil backend

Use the application-root START_HERE.md. npm start in this backend folder also starts integrated-server.js. Direct node server.js is a compatibility entry to the same integrated server.

Default storage is local and persistent; configure backend/.env using .env.example. The server binds 127.0.0.1 and serves frontend/dist plus /api. MongoDB is optional.

Integrated routes:
- GET /api/health and /api/system/health
- Existing /api/missions, /detections, /observations, /telemetry and mission route/statistics/history APIs
- POST /api/missions/:id/create-embeddings; GET /rag-documents, /search?q=..., /ask?q=...
- GET /api/inference/status; POST /api/inference/predict; GET /api/inference/files/:filename
- GET/POST /api/reports; GET /api/reports/:id; GET /api/reports/:id/download?format=pdf|csv

RAG indexes are scoped to stored mission records. Reports and inference artifacts are stored under the configured data directory. Gemini keys never belong in frontend environment files.

Run npm test for backend tests, npm run check:embedding for actual local embedding inference, and npm run check:gemini for provider connectivity. The latter prints only safe readiness metadata. The legacy sample-server.js exists for explicit fixture tests; it is not the integrated runtime.
