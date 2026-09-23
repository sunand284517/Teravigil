# Windows setup and recovery

Install Node.js 24 and Python 3.12. Enable Add Python to PATH and open a new terminal. Extract the entire archive into a writable folder such as Documents/TerraVigil. Do not run inside the ZIP viewer.

Double-click SETUP_TERRAVIGIL.bat once, or open a terminal in terravigil-database and run npm run setup. Setup downloads CPU packages and can take several minutes. Add your Gemini key to backend/.env. Then double-click START_TERRAVIGIL.bat and visit http://localhost:3000. Keep the terminal open.

If Python is missing, run py -3.12 --version and reinstall Python if needed. If the model is unavailable, run npm run setup:model and npm run doctor. A custom environment can be selected with INFERENCE_PYTHON in backend/.env. Paths containing spaces are supported; set the raw path without shell quoting inside .env.

If port 3000 is in use, close the earlier TerraVigil terminal or change PORT in backend/.env and open that port. If the browser still shows the old interface, reload after restarting the updated server and ensure you did not open the old standalone HTML file.

Do not delete backend/data to fix an unrelated setup error: it contains your saved missions, images and reports. Back up the whole folder first. Setup preserves .env and data.
