import snapshot from '../../public/gaming/data/public-snapshot.json';
import home from './media/home.json';
import natural from './media/natural.json';
import { introCopy } from './intro';

// Only published evaluations and the existing curated media manifests.
export const naraka = snapshot.collections.experiences.find(record => record.gameId === 'game:user:naraka')!;
export const gameplay = home.find(item => item.id === 'home-games')!;
export const clips = ['play-naraka-duel', 'play-halo-pistol', 'play-gears'].map(id => natural.find(item => item.id === id)!);
export const highlights = [gameplay, ...clips];
export const channel = introCopy.channel;
export const evaluationUrl = `/gaming/?view=results&experience=${encodeURIComponent(naraka.id)}`;
