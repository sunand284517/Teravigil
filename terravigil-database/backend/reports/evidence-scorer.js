'use strict';

/**
 * Evidence Scorer — uses MiniLM locally to rank mission evidence by relevance
 * to the report query, without any RAG index or vector store.
 *
 * Flow:
 *   1. Convert each mission evidence record into a short text snippet.
 *   2. Embed the query + each snippet using MiniLM (Xenova/all-MiniLM-L6-v2).
 *   3. Compute cosine similarity between query embedding and each snippet.
 *   4. Return the top-K most relevant snippets for Gemini to summarize.
 */

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const TOP_K = 20; // max evidence items passed to Gemini

// ─── Vector helpers ─────────────────────────────────────────────────────────

function vectorValues(output) {
  if (Array.isArray(output) || ArrayBuffer.isView(output)) return Array.from(output);
  if (output && Array.isArray(output.data)) return output.data.slice();
  if (output && ArrayBuffer.isView(output.data)) return Array.from(output.data);
  return null;
}

function normalize(values) {
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  if (!Number.isFinite(norm) || norm === 0) return null;
  return values.map(v => v / norm);
}

function poolAndNormalize(output) {
  const values = vectorValues(output);
  if (!values) return null;
  const dims = output && Array.isArray(output.dims) ? output.dims : null;
  const dim = (dims && dims[dims.length - 1]) || values.length;
  if (values.length === dim) return normalize(values);
  if (values.length % dim !== 0) return null;
  const rows = values.length / dim;
  const pooled = Array.from({ length: dim }, () => 0);
  for (let r = 0; r < rows; r++) for (let c = 0; c < dim; c++) pooled[c] += values[r * dim + c];
  return normalize(pooled.map(v => v / rows));
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return a.reduce((sum, v, i) => sum + v * b[i], 0); // both already normalized
}

// ─── Model loader (singleton) ────────────────────────────────────────────────

let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const transformers = await import('@huggingface/transformers');
      if (transformers.env) {
        transformers.env.allowRemoteModels = true;
        transformers.env.allowLocalModels = true;
      }
      return transformers.pipeline('feature-extraction', EMBEDDING_MODEL, {
        device: 'cpu',
        dtype: 'q8',
      });
    })();
  }
  return extractorPromise;
}

async function embed(extractor, text) {
  const output = await extractor(text, { pooling: 'mean', normalize: false });
  return poolAndNormalize(output);
}

// ─── Evidence → text snippets ────────────────────────────────────────────────

function detectionSnippet(d, index) {
  const id = d.detection_id ?? `detection-${index}`;
  const risk = d.risk_level ?? 'unknown';
  const conf = d.yolo_confidence != null ? `confidence ${d.yolo_confidence}` : '';
  const metal = d.metal_detected ? `metal detected (signal ${d.metal_signal ?? '?'})` : 'no metal';
  const pos = d.latitude != null ? `GPS ${d.latitude},${d.longitude}` : 'no GPS';
  return `[${id}] CONFIRMED detection. Risk: ${risk}. ${conf}. ${metal}. ${pos}. Status: ${d.status ?? 'CONFIRMED'}.`;
}

function observationSnippet(o, index) {
  const id = o.observation_id ?? `observation-${index}`;
  const risk = o.risk_level ?? 'unknown';
  const conf = o.yolo_confidence != null ? `confidence ${o.yolo_confidence}` : '';
  const metal = o.metal_detected ? `metal detected (signal ${o.metal_signal ?? '?'})` : 'no metal';
  const pos = o.latitude != null ? `GPS ${o.latitude},${o.longitude}` : 'no GPS';
  return `[${id}] UNCONFIRMED observation. Risk: ${risk}. ${conf}. ${metal}. ${pos}. Status: ${o.status ?? 'UNCONFIRMED'}.`;
}

function telemetrySnippet(t, index) {
  const pos = t.latitude != null ? `GPS ${t.latitude},${t.longitude} alt ${t.altitude ?? '?'}m` : 'no GPS';
  const ts = t.timestamp ? new Date(t.timestamp).toISOString() : 'unknown time';
  return `[telemetry-${index}] Drone position at ${ts}: ${pos}.`;
}

function inferenceSnippet(r, index) {
  const count = Array.isArray(r.predictions) ? r.predictions.length : 0;
  const localized = r.target_location_known === true ? 'geolocated' : 'not geolocated';
  return `[inference-run-${index}] Image inference: ${count} prediction(s), ${localized}.`;
}

function missionSnippet(m) {
  const site = m.location ?? m.siteName ?? m.site_name ?? m.mission_id ?? 'unknown';
  const date = m.date ? new Date(m.date).toISOString().slice(0, 10) : 'unknown date';
  const synthetic = m.synthetic ? ' (SYNTHETIC PRACTICE DATA)' : '';
  return `Mission at ${site} on ${date}${synthetic}. Status: ${m.status ?? 'unknown'}.`;
}

/**
 * Flattens a mission snapshot into an array of { type, id, text } items.
 */
function snapshotToItems(snapshot) {
  const items = [];
  for (const m of snapshot.missions ?? []) items.push({ type: 'mission', text: missionSnippet(m) });
  for (const [i, d] of (snapshot.detections ?? []).entries()) items.push({ type: 'detection', id: d.detection_id ?? i, text: detectionSnippet(d, i) });
  for (const [i, o] of (snapshot.observations ?? []).entries()) items.push({ type: 'observation', id: o.observation_id ?? i, text: observationSnippet(o, i) });
  for (const [i, t] of (snapshot.telemetry ?? []).entries()) items.push({ type: 'telemetry', text: telemetrySnippet(t, i) });
  for (const [i, r] of (snapshot.inference_runs ?? []).entries()) items.push({ type: 'inference_run', text: inferenceSnippet(r, i) });
  return items;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Scores all evidence in the snapshot against the query using MiniLM,
 * returns the top-K most relevant text snippets as a single string
 * ready to be injected into a Gemini prompt.
 *
 * @param {string} query - The report generation query.
 * @param {object} snapshot - The frozen mission snapshot.
 * @param {number} [topK] - Max items to return (default: TOP_K).
 * @returns {Promise<string>} - Formatted evidence block for Gemini prompt.
 */
async function scoreAndSelectEvidence(query, snapshot, topK = TOP_K) {
  const items = snapshotToItems(snapshot);
  if (items.length === 0) return 'No mission evidence records found.';

  // If evidence count is small, skip scoring and return all items.
  if (items.length <= topK) {
    return items.map(item => item.text).join('\n');
  }

  let extractor;
  try {
    extractor = await getExtractor();
  } catch {
    // If MiniLM fails to load, fall back to returning all items.
    console.warn('[evidence-scorer] MiniLM failed to load, returning all evidence without scoring.');
    return items.map(item => item.text).join('\n');
  }

  // Embed query and all items in parallel.
  const [queryVec, ...itemVecs] = await Promise.all([
    embed(extractor, query),
    ...items.map(item => embed(extractor, item.text)),
  ]);

  // Score and sort.
  const scored = items.map((item, i) => ({
    ...item,
    score: queryVec && itemVecs[i] ? cosineSimilarity(queryVec, itemVecs[i]) : 0,
  }));
  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, topK);
  return selected.map(item => `[score:${item.score.toFixed(3)}] ${item.text}`).join('\n');
}

module.exports = { scoreAndSelectEvidence };
