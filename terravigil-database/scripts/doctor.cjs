'use strict';
const path = require('node:path');
const { root, requireNode } = require('./runtime.cjs');
(async () => {
  requireNode();
  require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
  const { createPythonRunner } = require('../backend/inference/runner');
  const { createEmbedding } = require('../backend/rag/embed');
  const { readRagConfig } = require('../backend/rag/config');
  const { defaultCallModel } = require('../backend/rag/generate');
  const { connectDB, closeDB } = require('../backend/database');
  const results = [];
  try { await connectDB(); results.push({ component: 'Database', ready: true }); }
  catch { results.push({ component: 'Database', ready: false, detail: 'Check storage permissions or MongoDB settings.' }); }
  try { const status = await createPythonRunner().status(); results.push({ component: 'Detection model', ready: status.ready, model: status.model?.name, sha256: status.model?.sha256 }); }
  catch (error) { results.push({ component: 'Detection model', ready: false, detail: error.message }); }
  try { const vector = await createEmbedding('TerraVigil retrieval check'); results.push({ component: 'Embeddings', ready: vector.length === 384, dimensions: vector.length }); }
  catch { results.push({ component: 'Embeddings', ready: false, detail: 'Run backend npm run check:embedding; check the bundled cache and runtime dependencies.' }); }
  const config = readRagConfig();
  if (!config.geminiKey) results.push({ component: 'Gemini', ready: false, detail: 'GEMINI_API_KEY is missing in backend/.env.' });
  else {
    try { await defaultCallModel('Reply with READY.', { config }); results.push({ component: 'Gemini', ready: true, model: config.geminiModel }); }
    catch (error) { results.push({ component: 'Gemini', ready: false, detail: error.message }); }
  }
  console.log(JSON.stringify(results, null, 2));
  await closeDB();
  if (results.some(item => !item.ready)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
