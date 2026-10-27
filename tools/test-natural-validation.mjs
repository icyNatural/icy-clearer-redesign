import assert from 'node:assert/strict';
import { validate } from './local-author.mjs';

const piece = () => ({ id: 'natural-test', kind: 'placeholder', desktop: { x: 0, y: 0, width: 100, height: 100 }, mobile: { x: 0, y: 0, width: 100, height: 100 } });
const valid = { ...piece(), signals: ['NOW','PLAY'], tags: ['work in progress','basketball'], era: 'hoop era', temporal: 'Around summer 2019', visibility: 'draft', featured: true, playOrder: 12 };
assert.deepEqual(validate([structuredClone(valid)])[0], valid);
assert.equal(validate([{ ...piece(), curated: false }])[0].curated, false);
for (const [field, values] of Object.entries({
  signals: [[], ['now'], ['NOPE'], ['NOW','NOW'], 'NOW'],
  tags: ['tag', [''], [123], ['x'.repeat(101)], Array(31).fill('x')],
  era: ['future', 42], temporal: [42, 'x'.repeat(201)], visibility: ['private', false], curated: ['false'], featured: ['true'], playOrder: [-1, 10001],
})) for (const value of values) assert.throws(() => validate([{ ...piece(), [field]: value }]), undefined, `${field}: ${JSON.stringify(value)}`);
for (const era of ['childhood','school','early','hoop era','music era','current','undated']) validate([{ ...piece(), era }]);
for (const visibility of ['public','hidden','draft']) validate([{ ...piece(), visibility }]);
assert.equal(validate(Array.from({ length: 2000 }, (_, i) => ({ ...piece(), id: `test-${i}` })), 2000).length, 2000);
assert.throws(() => validate(Array.from({ length: 2001 }, (_, i) => ({ ...piece(), id: `test-${i}` })), 2000));
assert.throws(() => validate(Array.from({ length: 101 }, (_, i) => ({ ...piece(), id: `test-${i}` }))));
console.log('Natural metadata validation and room limits passed.');