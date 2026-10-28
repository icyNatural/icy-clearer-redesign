/* Public-only adapter. The personal storage backend is deliberately not shipped. */
(function (root) {
  'use strict';
  var GOS = root.GOS = root.GOS || {};
  var snapshot, ready = false;
  var clone = function (value) { return JSON.parse(JSON.stringify(value)); };
  var deny = function () { return Promise.reject(new Error('Published snapshot is read-only.')); };
  // Only transformed app/config references use this facade; real browser storage is untouched.
  root.PUBLIC_STORAGE = Object.freeze({ getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} });
  var collections = ['entities', 'edges', 'games', 'library', 'sessions', 'experiences', 'signals', 'taste', 'recommendations', 'evidence'];
  GOS.storage = Object.freeze({
    SCHEMA_VERSION: 3, COLLECTIONS: collections,
    init: function () {
      return fetch('data/public-snapshot.json', { cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error('Snapshot unavailable (' + response.status + ')');
        return response.json();
      }).then(function (data) {
        if (data.format !== 'icyNaturalGameOS.public' || data.version !== 1 || !data.collections.experiences.length) throw new Error('Invalid public snapshot');
        snapshot = data; ready = true;
        // Project real library identities into discovery without normalizing or merging names.
        var seed = root.GOS_SEED_GRAPH || { nodes: [], edges: [] };
        var personalIds = new Set(snapshot.collections.games.map(function (game) { return game.id; }));
        root.GOS_SEED_GRAPH = Object.assign({}, seed, { nodes: seed.nodes.filter(function (node) { return !personalIds.has(node.id); }).concat(snapshot.collections.games.map(function (game) { return Object.assign({}, game, { type: 'game' }); })) });
        var compute = GOS.taste.computePatterns;
        GOS.taste.computePatterns = function (input) { return compute(Object.assign({}, input, { now: snapshot.publishedAt })); };
        return { mode: 'public snapshot · read-only' };
      }).catch(function (error) {
        document.getElementById('publicLoading').textContent = 'Snapshot unavailable. Please try again later.';
        throw error;
      });
    },
    all: function (name) { return Promise.resolve(clone(snapshot.collections[name] || [])); },
    get: function (name, id) { return Promise.resolve(clone((snapshot.collections[name] || []).find(function (record) { return record.id === id; }) || null)); },
    mode: function () { return 'public snapshot · read-only'; },
    isReady: function () { return ready; },
    migrationState: function () { return {}; },
    migrateLegacy: function () { return Promise.resolve(); },
    put: deny, putMany: deny, clear: deny, remove: deny, importAll: deny,
    mirrorLegacy: deny, exportAll: deny
  });
  var tabs = ['dashboard', 'results', 'discover', 'atlas', 'feed', 'history'];
  var blocked = '#loadDemoBtn,#startTestBtn,#calculateBtn,#resetBtn,#clearLatestBtn,#clearHistoryBtn,#importDataFile,#exportDataBtn,[data-tab="test"],[data-tab="settings"],[data-go="test"],.gos-library-field,.gos-search-add:not(.is-known)';
  ['pointerdown', 'click', 'change', 'submit'].forEach(function (type) {
    document.addEventListener(type, function (event) {
      if (event.target.closest(blocked + ',#test,#settings')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
  });
  document.addEventListener('DOMContentLoaded', function () {
    ['saveExperience', 'addCatalogGame', 'setLibraryStatus', 'clearExperiences', 'importFile', 'exportData', 'setCatalogConfig'].forEach(function (key) { GOS.gos[key] = deny; });
    GOS.gos.catalogConfig = function () { return { proxyUrl: '', hasKey: false, _key: '' }; };
    ['saveToHistory', 'clearLatestGame', 'clearRecentGames', 'calculateScore'].forEach(function (key) { root[key] = function () {}; });
  });
  document.addEventListener('gos:ready', function () {
    document.getElementById('publicSnapshotNotice').textContent = 'PERSONAL GAMING SNAPSHOT · updated ' + snapshot.publishedAt.slice(0, 10) + ' · read-only';
    var latest = root.getHistory()[0];
    if (latest) root.loadHistoryItem(latest);
    var show = root.showTab;
    var applying = false;
    var selectedExperience = latest && latest.__experienceId;
    var loadHistoryItem = root.loadHistoryItem;
    root.loadHistoryItem = function (item) {
      selectedExperience = item.__experienceId;
      loadHistoryItem(item);
    };
    root.showTab = function (id, options) {
      if (tabs.indexOf(id) === -1) return;
      show(id, options);
      if (!applying) {
        var url = new URL(location.href);
        url.searchParams.set('view', id);
        if (id === 'results' && selectedExperience) url.searchParams.set('experience', selectedExperience);
        else url.searchParams.delete('experience');
        if (url.href !== location.href) history.pushState(null, '', url);
      }
    };
    function route() {
      applying = true;
      var params = new URL(location.href).searchParams;
      var tab = params.get('view') || 'dashboard';
      var experience = params.get('experience');
      if (tab === 'results' && experience) {
        var item = root.getHistory().find(function (record) { return record.__experienceId === experience; });
        if (item) root.loadHistoryItem(item);
        else root.showTab('history');
      } else root.showTab(tabs.indexOf(tab) === -1 ? 'dashboard' : tab);
      applying = false;
    }
    route();
    document.body.classList.remove('public-loading');
    document.getElementById('publicLoading').hidden = true;
    root.addEventListener('popstate', route);
  });
})(window);