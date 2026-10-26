/**
 * icyNatural Game OS — procedural cover art (presentation only).
 *
 * Deterministic: the same game name always yields the same artwork, so the
 * launcher looks stable across reloads. Everything is an inline SVG data URI —
 * no network requests, no external assets, no build step.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function shard(pts, fill) {
    return '<polygon points="' + pts + '" fill="' + fill + '"/>';
  }

  function cover(name, opts) {
    opts = opts || {};
    var w = opts.w || 640;
    var h = opts.h || 800;
    var key = String(name || 'unknown').trim().toLowerCase();
    var seed = hash(key);

    var hue = (opts.hue === undefined || opts.hue === null) ? seed % 360 : ((Number(opts.hue) % 360) + 360) % 360;
    var hueB = (hue + 34 + ((seed >> 7) % 70)) % 360;
    var hueC = (hue + 190 + ((seed >> 13) % 60)) % 360;
    var a1 = 0.5 + ((seed >> 3) % 22) / 100;
    var a2 = 0.16 + ((seed >> 11) % 14) / 100;

    var letter = (String(name || 'G').trim()[0] || 'G').toUpperCase();
    var cx = 30 + ((seed >> 5) % 40);
    var cy = 40 + ((seed >> 17) % 34);

    var s1x = (seed >> 4) % (w - 120);
    var s2x = (seed >> 9) % (w - 80);
    var s3x = (seed >> 15) % (w - 60);

    var svg = ''
      + '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
      + '<defs>'
      + '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="hsl(' + hue + ',68%,32%)"/>'
      + '<stop offset="0.55" stop-color="hsl(' + hueB + ',62%,21%)"/>'
      + '<stop offset="1" stop-color="hsl(' + hueC + ',56%,13%)"/>'
      + '</linearGradient>'
      + '<radialGradient id="glow" cx="' + cx + '%" cy="' + cy + '%" r="62%">'
      + '<stop offset="0" stop-color="hsl(' + hue + ',90%,62%)" stop-opacity="' + a1 + '"/>'
      + '<stop offset="1" stop-color="hsl(' + hue + ',90%,62%)" stop-opacity="0"/>'
      + '</radialGradient>'
      + '<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0.45" stop-color="#060709" stop-opacity="0"/>'
      + '<stop offset="1" stop-color="#060709" stop-opacity="0.72"/>'
      + '</linearGradient>'
      + '</defs>'
      + '<rect width="' + w + '" height="' + h + '" fill="url(#bg)"/>'
      + shard((-140 + s1x) + ',0 ' + (140 + s1x) + ',0 ' + (s1x + 40) + ',' + h + ' ' + (s1x - 240) + ',' + h,
        'hsl(' + hueC + ',70%,72%)" fill-opacity="0.12')
      + shard((-60 + s2x) + ',' + (h * 0.1) + ' ' + (70 + s2x) + ',' + (h * 0.04) + ' ' + (s2x + 10) + ',' + h + ' ' + (s2x - 120) + ',' + h,
        'hsl(' + hue + ',90%,78%)" fill-opacity="0.1')
      + shard((s3x) + ',0 ' + (s3x + 34) + ',0 ' + (s3x - 90) + ',' + h + ' ' + (s3x - 130) + ',' + h,
        '#ffffff" fill-opacity="0.07')
      + '<rect width="' + w + '" height="' + h + '" fill="url(#glow)"/>'
      + '<text x="' + (w * 0.74) + '" y="' + (h * 0.62) + '" font-family="system-ui,sans-serif" font-size="' + (h * 0.5) + '" font-weight="900" fill="#ffffff" fill-opacity="0.13" text-anchor="middle">' + esc(letter) + '</text>'
      + '<rect width="' + w + '" height="' + h + '" fill="url(#scrim)"/>'
      + '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27');
  }

  function style(el, name, pos, opts) {
    if (!el) return;
    el.style.backgroundImage = 'url(\'' + cover(name, opts) + '\')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = pos || 'center';
  }

  function enhanceHeroMosaic() {
    if (!root.document) return;
    var tiles = [
      { name: 'Halo Infinite', hue: 197 },
      { name: 'Naraka', hue: 326 },
      { name: 'Hi-Fi Rush', hue: 74 }
    ];
    for (var i = 0; i < tiles.length; i++) {
      var tile = root.document.querySelector('.img-row-' + (i + 1));
      if (!tile) continue;
      style(tile, tiles[i].name, 'center 30%', { hue: tiles[i].hue });
      if (!tile.querySelector('.img-row-label')) {
        var label = root.document.createElement('div');
        label.className = 'img-row-label';
        label.textContent = tiles[i].name;
        tile.appendChild(label);
      }
    }
  }

  GOS.art = { cover: cover, style: style };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', enhanceHeroMosaic);
    } else {
      enhanceHeroMosaic();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
