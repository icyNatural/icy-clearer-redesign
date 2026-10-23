import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { realpath, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createHash } from 'node:crypto';

const rooms = new Set(['home', 'natural', 'clear', 'worlds']);
const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv' };
export const cleanText = (value, max = 2000) => typeof value === 'string' ? value.replace(/[<>\u0000-\u001f\u007f\u2028\u2029]/g, '').trim().slice(0, max) : undefined;

// URL parsing canonicalizes numeric IPv4 forms before the address check.
function publicIP(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 2 && c === 0))) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113));
  }
  // Only global unicast IPv6; exclude special/transition/documentation ranges.
  const parts = address.toLowerCase().split(':');
  return isIP(address) === 6 && /^[23]/i.test(address) && parts[0] !== '2002' && parts[0] !== '3fff' && !(parts[0] === '2001' && (parseInt(parts[1] || '0', 16) < 0x200 || parts[1] === 'db8'));
}

export function safeHttp(value, base) {
  if (typeof value !== 'string' || value.length > 8192 || /[\s<>"'`\\\u0000-\u001f]/.test(value)) return undefined;
  try {
    const url = new URL(value, base);
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return undefined;
    if (!host || host === 'localhost' || /\.(localhost|local|internal|home|test|invalid)$/.test(host) || (!isIP(host) && !host.includes('.')) || (isIP(host) && !publicIP(host))) return undefined;
    return url.href;
  } catch { return undefined; }
}

export function safeLocal(value) {
  return typeof value === 'string' && /^\/media\/[\w./-]+$/.test(value) && !value.split('/').some(p => p === '..' || p === '.') && !value.includes('//');
}

// Resolve all DNS answers, reject mixed private/public answers, then pin the socket
// to a checked address. Redirects repeat the entire check (no DNS rebinding gap).
async function request(url, deadline, maxBytes, headersOnly = false) {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  const remaining = () => Math.max(1, deadline - Date.now());
  let timer;
  const addresses = await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('DNS timeout')), remaining()); }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(a => !publicIP(a.address)) || Date.now() >= deadline) throw new Error('Blocked address or timeout');
  return new Promise((resolveRequest, reject) => {
    const req = (parsed.protocol === 'https:' ? https : http).request(parsed, {
      method: 'GET', agent: false,
      headers: { 'User-Agent': 'LocalMediaAuthor/1.0', Accept: 'text/html,application/json,image/*,video/*;q=0.8', 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => options.all ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, addresses[0].family),
    }, res => {
      const type = String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if ((res.statusCode >= 300 && res.statusCode < 400) || (headersOnly && types[type])) {
        resolveRequest({ status: res.statusCode, headers: res.headers, type, data: Buffer.alloc(0) });
        res.destroy(); return;
      }
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > maxBytes) res.destroy(new Error('Response too large')); else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => resolveRequest({ status: res.statusCode, headers: res.headers, type, data: Buffer.concat(chunks) }));
    });
    const timeout = setTimeout(() => req.destroy(new Error('Fetch timeout')), remaining());
    req.on('error', reject);
    req.on('close', () => clearTimeout(timeout));
    req.end();
  });
}

async function fetchSafe(input, { maxBytes = 1024 * 1024, headersOnly = false } = {}) {
  let url = safeHttp(input);
  const deadline = Date.now() + 8000;
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (!url) throw new Error('Unsafe URL');
    const result = await request(url, deadline, maxBytes, headersOnly);
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      url = safeHttp(result.headers.location, url); continue;
    }
    if (result.status < 200 || result.status >= 300) throw new Error(`HTTP ${result.status}`);
    return { ...result, url };
  }
  throw new Error('Too many redirects');
}

function decode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    if (entity[0] === '#') { const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[entity.toLowerCase()] || match;
  });
}

function pageMetadata(html, url) {
  const tags = new Map(); let canonical;
  // Ignore comments and script/style bodies, never retain embed HTML or CSS.
  html = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  for (const match of html.matchAll(/<(meta|link)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const attrs = {};
    for (const a of match[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4]);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && !tags.has(key)) tags.set(key, attrs.content);
    if (match[1].toLowerCase() === 'link' && attrs.rel?.toLowerCase().split(/\s+/).includes('canonical')) canonical = safeHttp(attrs.href, url);
  }
  const get = (...keys) => keys.map(k => tags.get(k)).find(v => typeof v === 'string' && v.length);
  return {
    title: cleanText(get('og:title', 'twitter:title') || decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || ''), 500),
    description: cleanText(get('og:description', 'description', 'twitter:description')),
    author: cleanText(get('author', 'og:site_name'), 500),
    thumbnail: safeHttp(get('og:image:secure_url', 'og:image', 'twitter:image'), url),
    canonicalUrl: canonical || safeHttp(get('og:url'), url) || url,
  };
}

async function cacheThumbnail(url, root, room) {
  try {
    const result = await fetchSafe(url, { maxBytes: 5 * 1024 * 1024 });
    const ext = types[result.type];
    if (!ext || !result.type.startsWith('image/')) return url;
    const b = result.data;
    const valid = ext === 'jpg' ? b[0] === 255 && b[1] === 216 : ext === 'png' ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ext === 'gif' ? /^GIF8[79]a/.test(b.toString('ascii', 0, 6)) : ext === 'webp' ? b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' : b.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('ascii', 8, 40));
    if (!valid) return url;
    const media = await realpath(resolve(root, 'public/media'));
    const folder = resolve(media, room, 'remote');
    await mkdir(folder, { recursive: true });
    if (!(await realpath(folder)).startsWith(media + sep)) throw new Error('Unsafe cache path');
    const name = `${createHash('sha256').update(b).digest('hex').slice(0, 32)}.${ext}`;
    await writeFile(resolve(folder, name), b, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    return `/media/${room}/remote/${name}`;
  } catch { return url; }
}

export async function resolveSource(source, { root, room } = {}) {
  if (!rooms.has(room) || typeof source !== 'string' || source.length > 8192) throw new Error('Invalid room or source.');
  source = source.trim();
  const fetchedAt = new Date().toISOString();
  if (safeLocal(source)) {
    const media = await realpath(resolve(root, 'public/media'));
    const file = await realpath(resolve(root, 'public', source.slice(1)));
    if (!file.startsWith(media + sep) || !(await stat(file)).isFile()) throw new Error('Invalid local media.');
    const ext = extname(file).slice(1).toLowerCase();
    const type = ext === 'svg' ? 'image/svg+xml' : Object.entries(types).find(([, extension]) => extension === (ext === 'jpeg' ? 'jpg' : ext))?.[0];
    if (!type) throw new Error('Unsupported local media.');
    return { source, src: source, kind: type.startsWith('video/') ? 'video' : 'image', provider: 'local', metadata: { contentType: type, fetchedAt, status: 'ok' } };
  }
  const url = safeHttp(source);
  if (!url) throw new Error('Use a public http(s) URL or /media path.');
  const host = new URL(url).hostname.toLowerCase();
  const result = { source, kind: 'link', provider: 'web', metadata: { canonicalUrl: url, fetchedAt, status: 'ok' } };
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return { ...result, kind: 'unavailable', provider: 'instagram', metadata: { ...result.metadata, status: 'unsupported' } };
  try {
    const parsed = new URL(url);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
      result.provider = 'youtube';
      const id = host.endsWith('youtu.be') ? parsed.pathname.slice(1).split('/')[0] : parsed.pathname === '/watch' ? parsed.searchParams.get('v') : parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)\/?$/)?.[1];
      if (!/^[\w-]{11}$/.test(id || '')) throw new Error('Invalid YouTube video');
      result.kind = 'youtube'; result.videoId = id;
      result.metadata.canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
      const response = await fetchSafe(`https://www.youtube.com/oembed?url=${encodeURIComponent(result.metadata.canonicalUrl)}&format=json`);
      const data = JSON.parse(response.data.toString('utf8'));
      result.metadata.title = cleanText(data.title, 500);
      result.metadata.author = cleanText(data.author_name, 500);
      result.metadata.thumbnail = safeHttp(data.thumbnail_url);
      if (Number.isFinite(data.width) && Number.isFinite(data.height) && data.width > 0 && data.height > 0) result.metadata.aspect = Math.min(20, data.width / data.height);
      // oEmbed's player dimensions are often landscape even for a Shorts URL.
      if (parsed.pathname.startsWith('/shorts/')) result.metadata.aspect = 9 / 16;
    } else {
      const response = await fetchSafe(url, { headersOnly: true });
      result.metadata.contentType = response.type;
      if (types[response.type]) { result.kind = response.type.startsWith('video/') ? 'video' : 'image'; result.src = response.url; result.provider = 'direct'; }
      else if (['text/html', 'application/xhtml+xml'].includes(response.type)) Object.assign(result.metadata, pageMetadata(response.data.toString('utf8'), response.url));
    }
    if (result.metadata.thumbnail) result.metadata.thumbnail = await cacheThumbnail(result.metadata.thumbnail, root, room);
  } catch {
    result.kind = 'unavailable'; result.metadata.status = 'unavailable';
  }
  return result;
}