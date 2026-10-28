// Meanings transcribed from Icy Symbol Language Library. Context matters:
// MAKE uses the change/composition meaning of ⊕, not its astronomy meaning.
// Geometry paths are authored representations of these identities, not fonts.
export const signals = [
  { id: 'PLAY', label: 'PLAY', symbol: '◈', color: '#8ad26e', meaning: 'active phenomenon', geometryVariant: 'kinetic', note: 'gaming · basketball · movement · compete', paths: ['M12 2 22 12 12 22 2 12Z', 'M12 7 17 12 12 17 7 12Z'] },
  { id: 'VOICE', label: 'VOICE', symbol: '∿', color: '#ef806d', meaning: 'wave', geometryVariant: 'wave', note: 'music · rap · bars · lyrics · sound', paths: ['M2 15C5 15 5 5 9 5S13 19 17 19 20 9 22 9'] },
  { id: 'OBSERVE', label: 'OBSERVE', symbol: '𓂀', color: '#79bfe8', meaning: 'deep observation / seeing beneath appearance', geometryVariant: 'aperture', note: 'photography · nature · moments · notice', paths: ['M2 10Q10 3 22 10Q11 17 2 10Z', 'M3 5Q12 0 22 6', 'M11 6A4 4 0 1 0 11 14A4 4 0 1 0 11 6', 'M7 14 6 22 9 20 9 15', 'M11 15Q18 24 22 18Q24 14 20 16'] },
  { id: 'ARCHIVE', label: 'ARCHIVE', symbol: '🗃', color: '#d6b06f', meaning: 'archive / old material', geometryVariant: 'layered', note: 'childhood · diaries · notes · early versions', paths: ['M3 10H21V22H3Z', 'M5 10V6H19V10', 'M7 6V2H17V6', 'M9 14H15'] },
  { id: 'MAKE', label: 'MAKE', symbol: '⊕', color: '#b6cf63', meaning: 'add a layer / integrate / composition', geometryVariant: 'constructive', note: 'drawing · clothing · software · experiments', paths: ['M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2', 'M12 5V19M5 12H19'] },
  { id: 'NOW', label: 'NOW', symbol: '⟡', color: '#f1c56e', meaning: 'realization / anomaly / event noticed', geometryVariant: 'radiant', note: 'current work · recent media · in progress', paths: ['M12 2Q14 10 22 12Q14 14 12 22Q10 14 2 12Q10 10 12 2Z'] },
] as const;

export const infiniteMindIdentity = { symbol: '∞', meaning: 'unresolved / continuing / continuous' } as const;

export function signalGlyph(signal: typeof signals[number]) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-signal-glyph="${signal.id}">${signal.paths.map((d, index) => `<path d="${d}"${signal.id === 'PLAY' && index === 1 ? ' fill="currentColor"' : ''}/>` ).join('')}</svg>`;
}
