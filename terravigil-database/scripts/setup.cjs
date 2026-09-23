'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root, run, npm, requireNode, pythonForSetup } = require('./runtime.cjs');
try {
  requireNode();
  if (!process.argv.includes('--model-only')) {
    const environment = path.join(root, 'backend/.env');
    if (!fs.existsSync(environment)) fs.copyFileSync(path.join(root, 'backend/.env.example'), environment);
    console.log('Installing backend dependencies…');
    npm(['ci', '--no-audit', '--no-fund'], path.join(root, 'backend'));
    if (process.argv.includes('--dev') || !fs.existsSync(path.join(root, 'frontend/dist/index.html'))) {
      console.log('Installing and building the frontend…');
      npm(['ci', '--no-audit', '--no-fund'], path.join(root, 'frontend'));
      npm(['run', 'build'], path.join(root, 'frontend'));
    }
  }
  const python = pythonForSetup();
  const venv = path.join(root, '.venv');
  const executable = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!fs.existsSync(executable)) run(python.executable, [...python.args, '-m', 'venv', venv]);
  run(executable, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  console.log('Installing the CPU inference runtime (the first download is large)…');
  run(executable, ['-m', 'pip', 'install', 'torch==2.8.0', 'torchvision==0.23.0', ...(process.platform === 'darwin' ? [] : ['--index-url', 'https://download.pytorch.org/whl/cpu'])]);
  run(executable, ['-m', 'pip', 'install', '-r', path.join(root, 'inference/requirements.txt')]);
  run(executable, [path.join(root, 'inference/predict.py'), '--check']);
  console.log('\nSetup complete. Add your Gemini API key to backend/.env, then run npm start.');
  console.log('Without a key, model inference, retrieval and factual PDF/CSV reports work; AI answers and AI narratives require the key.');
} catch (error) { console.error(`\nSetup stopped: ${error.message}`); process.exitCode = 1; }
