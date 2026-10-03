'use strict';
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const fs = require('node:fs');
const express = require('express');
const { connectDB, closeDB, dataDirectory } = require('./database');
const { seedSample } = require('./seed-sample');
const { seedReferences } = require('./project-references');
const fixture = require('./sample/fixture.json');
const { createMissionApp } = require('./server');

function createIntegratedApp({ getDB = connectDB, dataDir = dataDirectory() } = {}) {
  const app = express();
  const api = express.Router();
  const preparedDb = Promise.resolve().then(getDB).then(async db => { await seedSample(db); return db; });
  // Startup errors are returned by requests or startServer, never unhandled.
  preparedDb.catch(() => {});
  const readyDB = () => preparedDb;
  const inferenceRouter = require('./inference/routes').createInferenceRouter({ getDB: readyDB, dataDir });
  const frontend = path.resolve(__dirname, '../frontend/dist');
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Local app: reject browser writes from unrelated sites. No wildcard CORS.
    const origin = req.headers.origin;
    if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      try {
        const supplied = new URL(origin);
        const host = req.headers.host;
        if (supplied.host !== host && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(supplied.hostname) && supplied.port === '5173')) {
          return res.status(403).json({ code: 'ORIGIN_REJECTED', message: 'Use the TerraVigil application on this computer.' });
        }
      } catch { return res.status(403).json({ code: 'ORIGIN_REJECTED', message: 'Invalid request origin.' }); }
    }
    next();
  });
  app.use(express.json({ limit: '15mb' }));
  api.use(async (_req, res, next) => {
    try { await readyDB(); next(); }
    catch { res.status(503).json({ code: 'DATABASE_UNAVAILABLE', message: 'Database unavailable. Check the backend terminal and storage configuration.' }); }
  });
  api.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'integrated', database: process.env.TERRAVIGIL_DB || 'local', sample: 'SAMPLE-TV001' }));
  api.get('/sample-mission', (_req, res) => res.json({ mission_id: 'SAMPLE-TV001', synthetic: true, created: false, persistence: 'database',
    counts: { detections: 4, observations: 4, telemetry: 20 }, suggestedRoute: fixture.mission.sample_route }));
  api.get('/missions/:missionId/training-context', (_req, res) => res.json(fixture.training_context));
  api.use('/missions/:missionId', async (req, res, next) => {
    const missionId = req.params.missionId;
    if (missionId === 'SAMPLE-TV001' && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(405).json({ code: 'SAMPLE_READ_ONLY', message: 'Sample source records are preserved. Create a new mission for your own data.' });
    }
    try {
      const db = await readyDB();
      if (await db.collection('missions').findOne({ mission_id: missionId })) await seedReferences(db, missionId);
      next();
    } catch (error) { next(error); }
  });
  api.use(async (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.body?.mission_id === 'SAMPLE-TV001' && /^\/(missions|detections|observations|telemetry|fusion)(\/|$)/.test(req.path)) {
        return res.status(405).json({ code: 'SAMPLE_READ_ONLY', message: 'The sample is preserved. Create a new mission for captured evidence.' });
      }
      if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const match = req.path.match(/^\/(detections|observations)\/([^/]+)$/);
        if (match) {
          try {
            const db = await readyDB();
            const key = match[1] === 'detections' ? 'detection_id' : 'observation_id';
            const row = await db.collection(match[1]).findOne({ [key]: decodeURIComponent(match[2]) });
            if (row?.mission_id === 'SAMPLE-TV001') return res.status(405).json({ code: 'SAMPLE_READ_ONLY', message: 'Sample source records are preserved.' });
          } catch (error) { return next(error); }
        }
      }
    }
    next();
  });
  api.get('/system/health', async (_req, res) => {
    const now = new Date().toISOString();
    const inference = inferenceRouter.getCachedStatus();
    res.json([
      { id: 'database', name: 'Mission database', status: 'ok', details: `${process.env.TERRAVIGIL_DB || 'local'} persistent storage connected`, lastHeartbeat: now },
      { id: 'inference', name: 'Trained detection model', status: inference.ready ? 'ok' : inference.status === 'unavailable' ? 'offline' : 'warning', details: inference.ready ? 'Bundled best.pt loaded and inference verified.' : inference.error?.message || 'Open Model inference to check the Python runtime and bundled checkpoint.', lastHeartbeat: inference.checkedAt || now },
      { id: 'reports', name: 'PDF and CSV reports', status: 'ok', details: 'Factual reports available. Optional AI narrative requires Gemini.', lastHeartbeat: now }
    ]);
  });
  api.get('/system/events', (_req, res) => res.json([]));
  api.get('/classes', (_req, res) => res.json([{ id: '12', name: 'land_mines', description: 'Landmine class from the supplied checkpoint; visual inference alone remains unconfirmed.', category: 'ordnance_ap' }]));
  api.use(require('./reports/routes').createReportRouter({ getDB: readyDB, dataDir }));
  api.use(inferenceRouter);
  api.use(createMissionApp({ getDB: readyDB, virtualSample: false }).app);
  api.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'API endpoint not found.' }));
  app.use('/api', api);
  // Keep legacy ingestion clients working while browser navigation uses the SPA.
  app.use((req, res, next) => {
    if (!req.headers.accept?.includes('text/html') && /^\/(health|missions|sample-mission|detections|observations|telemetry|fusion|inference|reports|system|classes)(\/|$)/.test(req.path)) return api(req, res, next);
    next();
  });
  app.use(express.static(frontend, { index: false }));
  app.get('/{*page}', (_req, res) => {
    const index = path.join(frontend, 'index.html');
    if (!fs.existsSync(index)) return res.status(503).send('Frontend build missing. Run npm run setup from the application folder.');
    res.sendFile(index);
  });
  app.use((error, _req, res, _next) => {
    const invalid = error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large';
    res.status(invalid ? (error.type === 'entity.too.large' ? 413 : 400) : 500).json({ code: invalid ? 'INVALID_REQUEST' : 'APPLICATION_ERROR', message: invalid ? 'Provide valid JSON within the upload limit.' : 'The request could not be completed. Check the backend terminal.' });
  });
  app.locals.ready = preparedDb;
  return app;
}

async function startServer() {
  const app = createIntegratedApp();
  await app.locals.ready;
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`TerraVigil integrated application: http://localhost:${port}`);
    console.log('Persistent missions, model inference, real RAG, and PDF/CSV reports.');
    if (!process.env.GEMINI_API_KEY) console.log('Assistant setup: add GEMINI_API_KEY to backend/.env and restart.');
  });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other backend or set PORT.` : error.message); process.exitCode = 1; });
  const stop = () => server.close(async () => { await closeDB(); process.exit(0); });
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  return server;
}
if (require.main === module) startServer().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createIntegratedApp, startServer };
