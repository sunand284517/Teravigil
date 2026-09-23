# TerraVigil frontend

Follow [START_HERE.md](../START_HERE.md) in the application root. Run `npm run setup` once from that root, add your Gemini key to `backend/.env`, and run `npm start`. Open http://localhost:3000. The supplied build uses the integrated API on the same origin.

The Model inference page runs the supplied checkpoint through the Python backend. Mission assistant prepares real MiniLM embeddings and calls Gemini. Reports creates persistent PDF and CSV editions. The synthetic sample is stored in the database and is clearly labeled.

For frontend development, run `npm run setup:dev` from the root. Keep the backend running, then use `npm run dev` here for Vite on port 5173 with `/api` proxied to port 3000. `npm run build` rebuilds the packaged UI. Backend secrets belong only in `backend/.env`.

`npm start` from this folder also starts the complete application. Opening `TerraVigil-preview.html` directly shows launch instructions. The explicitly named `demo` scripts are legacy offline design previews and do not run AI or create real reports.

Run `npm test`, `npm run typecheck`, and `npm run lint` here to check frontend changes. See the root [VERIFICATION.md](../VERIFICATION.md) for the shipped verification record.
