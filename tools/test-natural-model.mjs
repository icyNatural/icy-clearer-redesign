import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { artifactSignals, publicArtifact, orderedArtifacts, artifactMarkup } from '../src/scripts/natural-model.ts';
const items = JSON.parse(await readFile(new URL('../src/data/media/natural.json', import.meta.url)));
for (const item of items) {
  assert.ok(artifactSignals(item).length, `${item.id} has a lens`);
  for (const visibility of ['hidden', 'draft']) assert.equal(publicArtifact({ ...item, visibility }), false);
}
assert.equal(publicArtifact({ kind: 'text', text: 'Private diary', visibility: 'hidden' }), false);
assert.equal(publicArtifact({ kind: 'youtube', curated: false }), false);
assert.deepEqual(artifactSignals({ signals: ['VOICE', 'ARCHIVE', 'VOICE'] }), ['VOICE', 'ARCHIVE']);
const sample = { id: 'sample', kind: 'video', signals: ['PLAY', 'NOW'], src: '/media/real.mp4', overrides: { title: '<script>bad</script>' } };
assert.match(artifactMarkup(sample, 'PLAY'), /<video/);
assert.doesNotMatch(artifactMarkup(sample, 'NOW'), /<video/);
assert.doesNotMatch(artifactMarkup(sample, 'PLAY'), /<script>/);
assert.doesNotMatch(artifactMarkup({ ...sample, href: 'javascript:alert(1)' }, 'NOW'), /javascript:/);
const archive = Array.from({ length: 2000 }, (_, i) => ({ id: `artifact-${i}`, kind: 'text', playOrder: 2000 - i }));
assert.equal(orderedArtifacts(archive)[0].id, 'artifact-1999');
assert.equal(orderedArtifacts([{ playOrder: 0 }, { featured: true, playOrder: 100 }])[0].featured, true);
console.log('PASS Natural model: overlapping lenses, hidden/draft/curation safety, one video per artifact, escaped content, 2000-item prominence');