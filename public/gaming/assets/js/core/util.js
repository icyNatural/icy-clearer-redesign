/**
 * icyNatural Game OS — core utilities (no build step, classic script).
 *
 * Everything hangs off the single `GOS` global so the app stays loadable from
 * file:// as well as from a static server. Each module file re-opens the same
 * namespace: `(function (GOS) { ... })(window.GOS = window.GOS || {})`.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});

  var uidCounter = 0;

  function uid(prefix) {
    uidCounter += 1;
    var rand = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + uidCounter.toString(36) + rand;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Build a DOM element from a tag name + attributes + children (safe by default). */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs && typeof attrs === 'object') {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = String(value);
        else if (key === 'html') throw new Error('el() refuses raw HTML — use text');
        else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.keys(value).forEach(function (d) {
            if (value[d] !== null && value[d] !== undefined) node.dataset[d] = String(value[d]);
          });
        } else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, String(value));
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function setText(id, value) {
    var node = typeof id === 'string' ? document.getElementById(id) : id;
    if (!node) return null;
    node.textContent = value === null || value === undefined ? '' : String(value);
    return node;
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function safeNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  /** Same normalisation the shared branch-schema uses for alias/name lookup. */
  function normalizeKey(value) {
    if (value === null || value === undefined) return '';
    var text = String(value).trim().toLowerCase();
    if (text.normalize) text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    try {
      return text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    } catch (e) {
      return text.replace(/[^a-z0-9]+/g, ' ').trim();
    }
  }

  function slugify(value) {
    return normalizeKey(value).replace(/\s+/g, '-');
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    try {
      return date.toLocaleDateString();
    } catch (e) {
      return date.toISOString().slice(0, 10);
    }
  }

  function daysBetween(from, to) {
    var a = new Date(from).getTime();
    var b = new Date(to === undefined ? Date.now() : to).getTime();
    if (isNaN(a) || isNaN(b)) return 0;
    return Math.abs(b - a) / 86400000;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, wait || 120);
    };
  }

  function uniq(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (item) {
      var key = typeof item === 'string' ? item : JSON.stringify(item);
      if (seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    return out;
  }

  function groupBy(list, keyFn) {
    var out = {};
    (list || []).forEach(function (item) {
      var key = keyFn(item);
      (out[key] = out[key] || []).push(item);
    });
    return out;
  }

  function sortBy(list, scoreFn, descending) {
    return (list || []).slice().sort(function (a, b) {
      var diff = scoreFn(b) - scoreFn(a);
      if (diff === 0) diff = String(a.id || '').localeCompare(String(b.id || ''));
      return descending === false ? -diff : diff;
    });
  }

  GOS.util = {
    uid: uid,
    escapeHtml: escapeHtml,
    el: el,
    clear: clear,
    setText: setText,
    clamp: clamp,
    safeNumber: safeNumber,
    normalizeKey: normalizeKey,
    slugify: slugify,
    formatDate: formatDate,
    daysBetween: daysBetween,
    debounce: debounce,
    uniq: uniq,
    groupBy: groupBy,
    sortBy: sortBy
  };
})(typeof window !== 'undefined' ? window : globalThis);
