/** Privacy-first clip/media attachment metadata for local Game OS experiences. */
(function (root) {
  'use strict';
  var GOS = (root.GOS = root.GOS || {});
  var liveFiles = Object.create(null);
  var ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime', 'image/png', 'image/jpeg', 'image/webp'];
  var MAX_BYTES = 250 * 1024 * 1024;

  function validate(file) {
    if (!file) return { ok: false, error: 'No file selected.' };
    if (ALLOWED.indexOf(file.type) === -1) return { ok: false, error: 'Unsupported media type.' };
    if (Number(file.size) > MAX_BYTES) return { ok: false, error: 'Media must be 250 MB or smaller.' };
    return { ok: true };
  }

  function metadata(file, options) {
    options = options || {};
    var check = validate(file);
    if (!check.ok) throw new Error(check.error);
    var id = options.id || (GOS.util && GOS.util.uid ? GOS.util.uid('media') : 'media:' + Date.now());
    var visibility = options.visibility === 'public' ? 'public' : 'private';
    var record = {
      id: id,
      type: 'media-attachment',
      gameId: options.gameId || null,
      experienceId: options.experienceId || null,
      signalKeys: Array.isArray(options.signalKeys) ? options.signalKeys.slice() : [],
      name: String(file.name || 'Local media'),
      mimeType: file.type,
      size: Number(file.size) || 0,
      visibility: visibility,
      source: 'local-browser-file',
      availableLocally: true,
      autoPublish: false,
      created_at: new Date().toISOString()
    };
    liveFiles[id] = file;
    return record;
  }

  function previewUrl(id) {
    var file = liveFiles[id];
    return file && root.URL && root.URL.createObjectURL ? root.URL.createObjectURL(file) : null;
  }

  function release(url) {
    if (url && root.URL && root.URL.revokeObjectURL) root.URL.revokeObjectURL(url);
  }

  function publicRecord(record) {
    if (!record || record.visibility !== 'public') return null;
    return {
      format: 'icyNaturalGameOS.public-media',
      version: 1,
      id: record.id,
      gameId: record.gameId,
      experienceId: record.experienceId,
      signalKeys: (record.signalKeys || []).slice(),
      media: { name: record.name, mimeType: record.mimeType, size: record.size },
      status: 'local-reference-only',
      published: false,
      created_at: record.created_at
    };
  }

  GOS.media = {
    ALLOWED: ALLOWED,
    MAX_BYTES: MAX_BYTES,
    validate: validate,
    metadata: metadata,
    previewUrl: previewUrl,
    release: release,
    publicRecord: publicRecord,
    hasLocalFile: function (id) { return !!liveFiles[id]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);