// Export -> strict public allowlist -> preserved standalone app. Never opens browser storage.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [input, project = 'E:/Projects/icyNatural-game-os'] = process.argv.slice(2);
if (!input) throw Error('Usage: npm run gaming:publish -- <private-export.json> [Gaming OS project]');
const source = JSON.parse(await readFile(resolve(input), 'utf8'));
assert.equal(source.format, 'icyNaturalGameOS.export');
assert.equal(source.schemaVersion, 3, 'Unreviewed export schema');
const raw = source.collections;
assert.ok(raw?.experiences?.length, 'Refusing empty source');
const sandbox = { console }; sandbox.globalThis = sandbox; vm.createContext(sandbox);
for (const file of ['core/util.js','domain/signals.js','domain/taste.js']) vm.runInContext(await readFile(join(project, 'assets/js', file), 'utf8'), sandbox);
const vocabulary = [...sandbox.GOS.signals.CORE_DIMENSIONS, ...sandbox.GOS.signals.CONTEXTUAL];
const labels = Object.fromEntries(vocabulary.map(item => [item.key, item.label]));
labels.repetitive = 'Repetitive';
// Free text and arbitrary metadata are not public by default. Unknown fields never pass through.
const pick = (record, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]]));
const visible = r => r.private !== true && r.hidden !== true && r.isPrivate !== true && r.public !== false && !['private', 'hidden'].includes(r.visibility) && !['private', 'hidden'].includes(r.privacy) && r.privacy?.private !== true && r.privacy?.visibility !== 'private';
const fields = {
  games: ['id', 'name', 'created_at', 'updated_at'],
  library: ['id', 'gameId', 'status', 'created_at', 'updated_at'],
  experiences: ['id', 'gameId', 'gameName', 'platform', 'score', 'verdict', 'date', 'created_at', 'updated_at'],
  signals: ['id', 'experienceId', 'gameId', 'gameName', 'key', 'kind', 'polarity', 'importance', 'confidence', 'created_at', 'updated_at']
};
const collections = Object.fromEntries(['entities','edges','games','library','sessions','experiences','signals','taste','recommendations','evidence'].map(name => [name, []]));
collections.experiences = raw.experiences.filter(visible).map(record => {
  const out = pick(record, fields.experiences);
  assert.ok(Number.isFinite(out.score), 'Missing stored score');
  out.scores = pick(record.scores || {}, ['control','clarity','freedom','expression','engagement','depth','flow','intensity','replay']);
  assert.equal(Object.keys(out.scores).length, 9);
  out.context = { mode: ['overall','solo','co-op','competitive','casual','ranked'].includes(record.context?.mode) ? record.context.mode : 'overall' };
  // Friction/contextual labels are arbitrary free text; excluded pending individual review.
  out.notes = ''; out.friction = []; out.contextual = [];
  return out;
});
const ids = new Set(collections.experiences.map(r => r.id));
const games = new Set(collections.experiences.map(r => r.gameId));
for (const name of ['games','library','signals']) collections[name] = raw[name].filter(visible).filter(r => name === 'signals' ? ids.has(r.experienceId) : games.has(name === 'games' ? r.id : r.gameId)).map(r => {
  const out = pick(r, fields[name]);
  if (name === 'signals') {
    out.context = ['overall','solo','co-op','competitive','casual','ranked'].includes(r.context) ? r.context : 'overall';
    // Stable vocabulary label, not unreviewed free text or evidence.
    assert.ok(labels[r.key], 'Unknown signal requires public review: ' + r.key);
    assert.equal(r.label, labels[r.key], 'Nonstandard signal label requires public review');
    out.label = r.label;
    const ratingEvidence = /^([A-Za-z ]+) rated (\d+(?:\.\d+)?)\/10$/;
    out.evidence = r.evidence === 'Friction tag: Repetitive' || (ratingEvidence.test(r.evidence || '') && r.evidence.startsWith(r.label + ' rated ')) ? r.evidence : '';
  }
  return out;
});
for (const [name, records] of Object.entries(collections)) assert.equal(new Set(records.map(r => r.id)).size, records.length, 'Duplicate IDs: ' + name);
assert.equal(collections.games.length, games.size, 'Unresolved game identity');
const serialized = JSON.stringify(collections);
assert.ok(!/(?:file:\/\/|[a-z]:[\\/]|localhost|127\.0\.0\.1|bearer\s|api[_-]?key|access[_-]?token)/i.test(serialized), 'Potential private data: manual review required');
const publishedAt = new Date().toISOString();
const patterns = sandbox.GOS.taste.computePatterns({ experiences: collections.experiences, signals: collections.signals, gamesById: Object.fromEntries(collections.games.map(r => [r.id,r])), now: publishedAt });
const snapshot = { format: 'icyNaturalGameOS.public', version: 1, publishedAt, description: 'Personal subjective evaluations; a published snapshot, not live account history.', collections, patternCount: patterns.length };
const output = join(root, 'public/gaming');
// This directory is generated only. Remove stale generated assets, never source or private data.
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'data'), { recursive: true });
// Explicit runtime allowlist: no backups, tests, private exports, storage implementation or recovery tools.
const scripts = ['core/util.js','ui/art.js','data/branch-vocab.js','data/seed-graph.js','domain/signals.js','domain/glyph.js','domain/media.js','domain/catalog.js','domain/lineage.js','domain/taste.js','domain/recommend.js','ui/glyph.js','app.js','ui/gos.js','ui/test-ac.js','ui/discover.js','ui/atlas.js','ui/feed.js'];
await mkdir(join(output, 'assets/css'), { recursive: true });
await cp(join(project,'assets/css/styles.css'), join(output,'assets/css/styles.css'));
for (const script of scripts) {
  const path = join(output, 'assets/js', script); await mkdir(dirname(path), { recursive: true });
  let text = await readFile(join(project,'assets/js',script), 'utf8');
  if (['app.js','ui/gos.js'].includes(script)) text = text.replace(/\blocalStorage\b/g, 'PUBLIC_STORAGE');
  if (script === 'app.js') {
    // No synthetic evaluation even embedded in the public script. Its hidden handler stays inert.
    text = text.replace(/const demoState = \{[\s\S]*?\n\};/, 'const demoState = Object.freeze({});');
  }
  await writeFile(path, text);
}
let html = await readFile(join(project,'index.html'), 'utf8');
html = html.replace('<script src="assets/js/storage/store.js"></script>', '<script src="public-mode.js"></script>');
html = html.replace('</head>', '  <link rel="stylesheet" href="public-mode.css" />\n</head>');
html = html.replace('<div class="top-actions">', '<div class="top-actions"><a class="public-home-link" href="/">HOME</a>');
html = html.replace('<p class="subtext">Personal gaming intelligence — evidence from your own vault</p>', '<p id="publicSnapshotNotice" class="public-snapshot-notice">Loading personal gaming snapshot…</p>');
html = html.replace('all from a vault that never leaves this browser.', 'from my published, read-only snapshot. These are my subjective evaluations, not objective review scores.');
html = html.replace('personal gaming intelligence, local vault.', 'personal subjective gaming evaluations — public read-only snapshot.');
html = html.replace('Your games. Your evidence.', 'My games. My evidence.');
html = html.replace('<h2 id="resultGame">Hi-Fi Rush</h2>', '<h2 id="resultGame">Published evaluation</h2>');
html = html.replace('<div class="sr-only" id="resultScore" data-value="8.2">8.2</div>', '<div class="sr-only" id="resultScore">—</div>');
html = html.replace('Start a test or load the optional demo', 'Published personal evaluation');
html = html.replace('<body data-view="dashboard">', '<body data-view="dashboard" class="public-loading"><p id="publicLoading" role="status">Loading personal gaming snapshot…</p>');
// Non-personal seed catalog supports discovery only; it is never presented as played history.
await writeFile(join(output,'index.html'), html);
await cp(join(root,'tools/gaming-public.js'), join(output,'public-mode.js'));
await cp(join(root,'tools/gaming-public.css'), join(output,'public-mode.css'));
await writeFile(join(output,'data/public-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ output, experiences: collections.experiences.length, games: collections.games.length, library: collections.library.length, signals: collections.signals.length, patterns: patterns.length, snapshotSHA256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') }, null, 2));