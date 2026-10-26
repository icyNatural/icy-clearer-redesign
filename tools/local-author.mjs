import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { resolveSource, safeHttp, safeLocal, cleanText } from './media-sources.mjs';
const homeTextStyles = ['handle','archive','title','signature','intro-heading','intro-body','sky-note','ideas','portal-note','interest-heading'];

const rooms = ['home', 'natural', 'clear', 'worlds'];
const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm'];
const limit = 32 * 1024 * 1024;
const bounded = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const existingLocal = value => typeof value === 'string' && /^\/(?!\/)[\w/.-]+$/.test(value) && !value.includes('..');
export function validate(items) {
  if (!Array.isArray(items) || items.length > 100) throw new Error('Use at most 100 pieces per room.');
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,100}$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate media ID.');
    ids.add(item.id);
    if (item.sceneStyle !== undefined && (!homeTextStyles.includes(item.sceneStyle) || item.kind !== 'text')) throw new Error('Invalid HOME text style.');
    if (item.parts !== undefined && (!Array.isArray(item.parts) || item.parts.length > 10 || item.parts.some(part => typeof part !== 'string' || part.length > 500))) throw new Error('Invalid group captions.');
    if (item.previewImages !== undefined) {
      if (!Array.isArray(item.previewImages) || item.previewImages.length > 2) throw new Error('Invalid HOME entrance previews.');
      item.previewImages = item.previewImages.map(preview => {
        if (!preview || typeof preview.src !== 'string' || (!safeLocal(preview.src) && !safeHttp(preview.src)) || typeof preview.alt !== 'string' || preview.alt.length > 500) throw new Error('Invalid entrance preview media.');
        return { src: preview.src, alt: cleanText(preview.alt, 500) };
      });
    }
    if (item.deleted === true) continue;
    if (item.kind === 'native') {
      if (typeof item.nativeId !== 'string' || !/^natural-[\w-]+$/.test(item.nativeId)) throw new Error('Invalid Natural object.');
      if (item.nativeText !== undefined && (!Array.isArray(item.nativeText) || item.nativeText.length > 10 || item.nativeText.some(text => typeof text !== 'string' || text.length > 500))) throw new Error('Invalid Natural text.');
      if (item.z !== undefined && !bounded(item.z, 0, 100)) throw new Error('Invalid layer.');
      for (const key of ['desktop', 'mobile']) {
        const p = item[key];
        if (!p || !bounded(p.x, 0, 100) || !bounded(p.y, 0, 100) || !bounded(p.width, 5, 200) || !bounded(p.height, 5, 200)) throw new Error('Invalid Natural placement.');
      }
      continue;
    }
    if (!['image', 'video', 'youtube', 'link', 'unavailable', 'placeholder', 'text'].includes(item.kind)) throw new Error('Unsupported media kind.');
    if (item.fit !== undefined && !['contain', 'cover'].includes(item.fit)) throw new Error('Invalid fitting.');
    if (item.kind === 'text') {
      if (typeof item.text !== 'string' || item.text.length > 500) throw new Error('Text must be under 500 characters.');
      item.text = item.text.split('\n').map(line => cleanText(line, 500)).join('\n');
      if (!bounded(item.textSize, 12, 120) || !['serif','sans','mono','handwriting'].includes(item.font) || !['light','dark','icy'].includes(item.color) || !['left','center','right'].includes(item.align)) throw new Error('Invalid text styling.');
    }
    if ((['image', 'video'].includes(item.kind) && !item.src) || (item.src !== undefined && !existingLocal(item.src) && !safeHttp(item.src))) throw new Error('Media must use a safe media path or http(s) URL.');
    if (item.source !== undefined && !safeLocal(item.source) && !safeHttp(item.source)) throw new Error('Invalid source.');
    if (item.provider !== undefined && (typeof item.provider !== 'string' || !/^[a-zA-Z0-9.-]{1,100}$/.test(item.provider))) throw new Error('Invalid provider.');
    if ((item.kind === 'youtube' && !item.videoId) || (item.videoId !== undefined && (typeof item.videoId !== 'string' || !/^[\w-]{11}$/.test(item.videoId)))) throw new Error('Invalid video ID.');
    if (item.href && !safeHttp(item.href) && !(typeof item.href === 'string' && /^\/(?!\/)[\w/.-]*$/.test(item.href) && !item.href.includes('..'))) throw new Error('Links must be local or http(s).');
    for (const field of ['metadata', 'overrides']) if (item[field] !== undefined) {
      const object = item[field];
      if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error(`Invalid ${field}.`);
      const allowed = field === 'overrides' ? ['title', 'description', 'alt', 'label'] : ['title', 'description', 'author', 'thumbnail', 'canonicalUrl', 'contentType', 'aspect', 'duration', 'fetchedAt', 'status'];
      const sanitized = {};
      for (const key of allowed) if (object[key] !== undefined) {
        const value = object[key];
        if (['aspect', 'duration'].includes(key)) {
          if (!bounded(value, key === 'aspect' ? 0.01 : 0, key === 'aspect' ? 20 : 31536000)) throw new Error(`Invalid ${key}.`);
          sanitized[key] = value;
        } else {
          if (typeof value !== 'string' || value.length > 8192) throw new Error(`Invalid ${key}.`);
          if (['thumbnail', 'canonicalUrl'].includes(key)) {
            if (!safeHttp(value) && !(key === 'thumbnail' && safeLocal(value))) throw new Error(`Unsafe ${key}.`);
            sanitized[key] = value;
          } else {
            if (key === 'contentType' && !/^[\w.+-]+\/[\w.+-]+$/.test(value)) throw new Error('Invalid content type.');
            if (key === 'fetchedAt' && !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value)) throw new Error('Invalid timestamp.');
            sanitized[key] = cleanText(value);
          }
        }
      }
      item[field] = sanitized;
    }
    for (const key of ['label', 'group']) if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].length > 200)) throw new Error('Labels must be under 200 characters.');
    if (item.shape && !['rectangle', 'arch', 'round', 'organic'].includes(item.shape)) throw new Error('Invalid shape.');
    if (item.objectPosition && !/^\d{1,3}% \d{1,3}%$/.test(item.objectPosition)) throw new Error('Invalid crop.');
    if (item.rotation !== undefined && !bounded(item.rotation, -180, 180)) throw new Error('Invalid rotation.');
    if (item.z !== undefined && !bounded(item.z, 0, 100)) throw new Error('Invalid layer.');
    for (const key of ['desktop', 'mobile']) if (item[key]) {
      const p = item[key];
      if (!bounded(p.x, 0, 100) || !bounded(p.y, 0, 100) || !bounded(p.width, item.sceneStyle ? 1 : 5, 100) || !bounded(p.height, item.sceneStyle ? 1 : 5, 100) || p.x + p.width > 100.1 || p.y + p.height > 100.1) throw new Error('Keep media inside the room canvas.');
    }
  }
  return items.map(item => {
    if (item.deleted === true) return { id: item.id, deleted: true };
    if (item.kind === 'native') return { id: item.id, kind: 'native', nativeId: item.nativeId, nativeText: item.nativeText, desktop: item.desktop, mobile: item.mobile, z: item.z };
    const result = Object.fromEntries(Object.entries(item).filter(([key]) => ['id','src','source','provider','videoId','metadata','overrides','kind','desktop','mobile','shape','objectPosition','rotation','z','label','href','group','deleted','fit','text','textSize','font','color','align','sceneStyle','parts','previewImages'].includes(key)));
    for (const key of ['desktop', 'mobile']) if (result[key]) result[key] = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, result[key][k]]));
    for (const key of ['label', 'group']) if (result[key] !== undefined) result[key] = cleanText(result[key], 200);
    return result;
  });
}

export function localAuthor() {
  let enabled = false;
  let busy = false;
  return {
    name: 'icy-local-author',
    apply: 'serve',
    config(_, env) { enabled = env.mode === 'author'; },
    configureServer(server) {
      if (!enabled) return;
      const root = server.config.root;
      const hosts = new Set(['localhost', '127.0.0.1', '[::1]', ...Object.values(networkInterfaces()).flat().filter(Boolean).map(n => n.address)]);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__author/')) return next();
        const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
        try {
          const host = new URL(`http://${req.headers.host}`).hostname;
          if (!hosts.has(host)) return send(403, { error: 'Local hosts only.' });
          if (req.method !== 'POST' || req.headers['x-icy-author'] !== '1' || req.headers.origin !== `http://${req.headers.host}` || !req.headers['content-type']?.startsWith('application/json')) return send(403, { error: 'Same-origin editor requests only.' });
          let bytes = 0; const chunks = [];
          for await (const chunk of req) { bytes += chunk.length; if (bytes > limit) throw new Error('Request too large (32 MB maximum).'); chunks.push(chunk); }
          const body = JSON.parse(Buffer.concat(chunks).toString());
          if (!rooms.includes(body.room)) throw new Error('Unknown room.');
          if (req.url === '/__author/resolve') return send(200, await resolveSource(body.source, { root, room: body.room }));
          if (req.url === '/__author/upload') {
            const ext = String(body.name).split('.').pop().toLowerCase();
            if (!extensions.includes(ext) || typeof body.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data)) throw new Error('Choose a supported image or video.');
            const data = Buffer.from(body.data, 'base64');
            if (!data.length || data.length > 23 * 1024 * 1024) throw new Error('File must be between 1 byte and 23 MB.');
            const signature = data.subarray(0, 16);
            const valid = ext === 'png' ? signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ['jpg','jpeg'].includes(ext) ? signature[0] === 255 && signature[1] === 216 : ext === 'gif' ? signature.toString().startsWith('GIF8') : ext === 'webp' ? signature.toString().startsWith('RIFF') && signature.toString().includes('WEBP') : ext === 'mp4' ? signature.subarray(4,8).toString() === 'ftyp' : signature.subarray(0,4).equals(Buffer.from([26,69,223,163]));
            if (!valid) throw new Error('File contents do not match the extension.');
            const name = `${createHash('sha256').update(data).digest('hex').slice(0,20)}.${ext}`;
            const folder = resolve(root, 'public/media', body.room); await mkdir(folder, { recursive: true });
            await writeFile(join(folder, name), data);
            return send(200, { src: `/media/${body.room}/${name}`, kind: ['mp4','webm'].includes(ext) ? 'video' : 'image' });
          }
          if (req.url === '/__author/save') {
            if (busy) return send(409, { error: 'A save is already in progress. Try again.' });
            const items = validate(body.items);
            if (body.room !== 'home' && items.some(item => item.sceneStyle || item.parts || item.previewImages)) throw new Error('HOME composition belongs to HOME only.');
            if (body.room !== 'natural' && items.some(item => item.kind === 'native')) throw new Error('Native objects belong to Natural only.');
            const file = resolve(root, 'src/data/media', `${body.room}.json`);
            busy = true;
            try {
              const previous = await readFile(file, 'utf8');
              if (body.revision && createHash('sha256').update(previous).digest('hex') !== body.revision) return send(409, { error: 'Source changed in another window. Refresh before saving.' });
              const temp = `${file}.${randomUUID()}.tmp`; await writeFile(temp, JSON.stringify(items, null, 2) + '\n'); await rename(temp, file);
            }
            finally { busy = false; }
            // Invalidate SSR's eager JSON imports before the editor refreshes.
            // Otherwise the first reload can render the previous manifest.
            server.moduleGraph.invalidateAll();
            for (const environment of Object.values(server.environments || {})) environment.moduleGraph?.invalidateAll();
            return send(200, { saved: true });
          }
          send(404, { error: 'Unknown editor operation.' });
        } catch (error) { send(400, { error: error.message || 'Unable to save.' }); }
      });
    },
  };
}
