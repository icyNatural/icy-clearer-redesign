import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import snapshot from '../../public/gaming/data/public-snapshot.json';
import home from './media/home.json';
import natural from './media/natural.json';
import { introCopy } from './intro';

// Consume only the published snapshot. Never open the personal database/export.
export const naraka = snapshot.collections.experiences.find(record => record.gameId === 'game:user:naraka')!;
export const gameplay = home.find(item => item.id === 'home-games')!;
export const clips = natural.filter(item => ['play-gears', 'play-supplied-short', 'play-marvel'].includes(item.id));
export const channel = introCopy.channel;

// Execute the exact published geometry engine at build time; no copied formula,
// client storage, score recalculation, or dependency on the standalone app boot.
const context = vm.createContext({});
vm.runInContext(readFileSync(resolve(process.cwd(), 'public/gaming/assets/js/domain/glyph.js'), 'utf8'), context);
const engine = context.GOS.glyphEngine;
export const radar = engine.geometry(naraka.scores, { score: naraka.score, variant: 'session' });