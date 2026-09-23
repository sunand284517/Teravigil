# Run TerraVigil

This version runs the trained model, indexes real mission records for retrieval, and creates downloadable PDF/CSV reports. The bundled mission remains synthetic test data.

1. Extract the entire ZIP into a writable folder. Keep all folders together.
2. Install Node.js 24 (or Node.js 22.12+ within 22.x) and Python 3.12 (3.10–3.12 supported). On Windows enable **Add Python to PATH** and reopen your terminal.
3. From the `terravigil-database` folder run **`npm run setup`**. Windows users can double-click `SETUP_TERRAVIGIL.bat`. The first setup needs internet and downloads the CPU inference dependencies. The trained weights, embedding model and built frontend are already included.
4. Setup creates `backend/.env`. Set `GEMINI_API_KEY=your_real_key`. Keep the key private. The configured Gemini model must be available to your project; change `GEMINI_MODEL` if needed.
5. Run **`npm start`** or double-click `START_TERRAVIGIL.bat`. Keep that terminal open and visit **http://localhost:3000**.

Without a Gemini key, actual image inference, semantic retrieval and factual PDF/CSV reports remain available. The assistant and optional AI report narratives show a configuration error until a working key is set. They never silently substitute canned answers.

## Try the complete application

- **Model inference:** upload a JPEG/PNG/WebP, set a confidence threshold and run inference. The exact supplied `best.pt` produces predictions and an annotated image. `examples/validation-montage.jpg` is included for a smoke test; it already contains labels and is not an accuracy benchmark. GPS is optional. Only geolocated land_mines outputs are saved as unconfirmed observations; all image predictions are stored with their inference session and can appear in reports/RAG.
- **Field copilot:** select SAMPLE-TV001 or your inference mission. Ask about its records. The sample now runs through genuine MiniLM indexing and Gemini generation. Open the displayed source citations. An example precise query is “What is the confidence of SAMPLE-TV001-D001?”
- **Reports:** select a mission, choose a factual report or enable an AI narrative, and Generate report. Download PDF and CSV. Factual mode needs no Gemini key; AI failures remain visible. New editions preserve earlier files and frozen sources.
- **Route planner:** select endpoints A and B and compute a route. The solid line is the recorded flight track; the dashed line is the advisory A→B route. This is recorded-point geometry, not terrain-aware clearance.
- **System:** inspect database, embedding, model and provider status. Run `npm run doctor` in the terminal for live dependency checks. It returns a nonzero exit code if a required dependency/key is missing.

See README.md for development, data persistence, optional MongoDB and the verified limits of this package.
