import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { artifactSignals, artifactAspect, publicArtifact, orderedArtifacts, artifactMarkup } from '../src/scripts/natural-model.ts';
const items = JSON.parse(await readFile(new URL('../src/data/media/natural.json', import.meta.url)));
for (const item of items) {
  assert.ok(artifactSignals(item).length, `${item.id} has a lens`);
  for (const visibility of ['hidden', 'draft']) assert.equal(publicArtifact({ ...item, visibility }), false);
}
assert.equal(publicArtifact({ kind: 'text', text: 'Private diary', visibility: 'hidden' }), false);
assert.equal(publicArtifact({ kind: 'youtube', curated: false }), false);
assert.deepEqual(artifactSignals({ signals: ['VOICE', 'ARCHIVE', 'VOICE'] }), ['VOICE', 'ARCHIVE']);
const sample = { id: 'sample', kind: 'video', signals: ['PLAY', 'NOW'], src: '/media/real.mp4', overrides: { title: '<script>bad</script>' } };
assert.match(artifactMarkup(sample, 'PLAY'), /data-play-natural-video/);
assert.doesNotMatch(artifactMarkup(sample, 'PLAY'), /<video|autoplay/);
assert.doesNotMatch(artifactMarkup(sample, 'NOW'), /<video/);
assert.doesNotMatch(artifactMarkup(sample, 'PLAY'), /<script>/);
assert.doesNotMatch(artifactMarkup({ ...sample, href: 'javascript:alert(1)' }, 'NOW'), /javascript:/);
assert.equal(artifactAspect({ metadata: { aspect: 9 / 16 } }), 9 / 16);
assert.equal(artifactAspect({ kind: 'video', metadata: { aspect: 'invalid' } }), 16 / 9);
assert.equal(artifactAspect({ pixelWidth: 1920, pixelHeight: 1080 }), 16 / 9);
assert.match(artifactMarkup({ ...sample, metadata: { aspect: 9 / 16, thumbnail: '/poster.jpg' } }, 'NOW'), /data-media-shape="portrait"/);
const archive = Array.from({ length: 2000 }, (_, i) => ({ id: `artifact-${i}`, kind: 'text', playOrder: 2000 - i }));
assert.equal(orderedArtifacts(archive)[0].id, 'artifact-1999');
assert.equal(orderedArtifacts([{ playOrder: 0 }, { featured: true, playOrder: 100 }])[0].featured, true);
console.log('PASS Natural model: overlapping signals, visibility, preview-first video, native aspect metadata, escaped content, 2000-item prominence');
