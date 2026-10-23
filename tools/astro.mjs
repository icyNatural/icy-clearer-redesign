#!/usr/bin/env node
// Astro CLI launcher that keeps the Local Studio authoring mode intact.
//
// `npm run edit` must reach `astro dev --mode author` inside the server process.
// Astro 7 re-spawns itself in the background whenever it detects an AI agent
// shell, and that re-spawn rebuilds the command line without `--mode`, so the
// editor silently switches off. Launching Astro from a shell Astro reads as an
// ordinary terminal keeps `--mode author`, the normal log format and the
// foreground dev server exactly as `npm run edit` behaved before.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const astro = resolve(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const args = process.argv.slice(2);

if (!existsSync(astro)) {
  console.error('Astro is not installed here. Run npm install first.');
  process.exit(1);
}

// Environment markers used to decide the shell belongs to an AI agent.
const agentMarkers = [
  /^OPENCODE(_|$)/,
  'CLAUDECODE',
  'CODEX_THREAD_ID',
  'GEMINI_CLI',
  'AIDER_API_KEY',
  'REPL_ID',
  'CODEIUM_EDITOR_APP_ROOT',
  'AUGMENT_AGENT',
  'QWEN_CODE',
  'ANTIGRAVITY_AGENT',
  'ANTIGRAVITY_PROJECT_ID',
  'AMP_CURRENT_THREAD_ID'
];

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (agentMarkers.some(marker => (typeof marker === 'string' ? key === marker : marker.test(key)))) delete env[key];
}

// `astro dev --force` is documented to replace a server that is already
// listening, so retire the previous one before starting in the foreground.
if (args[0] === 'dev' && args.includes('--force') && existsSync(resolve(root, '.astro', 'dev.json'))) {
  spawnSync(process.execPath, [astro, 'dev', 'stop'], { cwd: root, env, stdio: 'ignore' });
}

const child = spawn(process.execPath, [astro, ...args], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
