(function () {
  'use strict';

  var LS_KEY = 'gta6-trophy-guide-01.progress.v1';
  var LS_SPOILER = 'gta6-trophy-guide-01.spoiler.v1';

  var state = {
    trophies: [],
    roadmap: null,
    sourcesText: '',
    checked: {},   // id -> true
    spoiler: false,
    grade: 'all',
    kind: 'all',
    missableOnly: false
  };

  var els = {
    progressFill: document.getElementById('progressFill'),
    progressNums: document.getElementById('progressNums'),
    gradeFilter: document.getElementById('gradeFilter'),
    kindFilter: document.getElementById('kindFilter'),
    missableToggle: document.getElementById('missableToggle'),
    spoilerToggle: document.getElementById('spoilerToggle'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    resultHint: document.getElementById('resultHint'),
    trophyList: document.getElementById('trophyList'),
    roadmapIntro: document.getElementById('roadmapIntro'),
    roadmapStages: document.getElementById('roadmapStages'),
    sourcesText: document.getElementById('sourcesText')
  };

  function loadProgress() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) state.checked = JSON.parse(raw);
      var sp = localStorage.getItem(LS_SPOILER);
      if (sp === '1') state.spoiler = true;
    } catch (e) { state.checked = {}; }
  }

  function saveProgress() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.checked));
      localStorage.setItem(LS_SPOILER, state.spoiler ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

  function matches(t) {
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.kind !== 'all') {
      if (state.kind === 'missable') { if (!t.missable) return false; }
      else if (t.kind !== state.kind) return false;
    }
    if (state.missableOnly && !t.missable) return false;
    return true;
  }

  function isMasked(t) {
    return state.spoiler && t.hidden && t.kind === 'story' && !state.checked[t.id];
  }

  function badgeFor(t) {
    var html = '<span class="badge ' + t.grade + '">' + gradeLabel(t.grade) + '</span>';
    html += '<span class="badge kind">' + t.kind + '</span>';
    if (t.missable) html += '<span class="badge missable">missable</span>';
    return html;
  }

  function sourcesLine(t) {
    var names = (t.sources && t.sources.length) ? t.sources : ['Exophase trophy page', 'PSNProfiles GTA VI guide', 'official PSN description'];
    return 'Sources: ' + names.join('; ') + '.';
  }

  function trophyRow(t) {
    var li = document.createElement('li');
    li.className = 'trophy' + (state.checked[t.id] ? ' done' : '');
    li.dataset.id = t.id;

    var masked = isMasked(t);
    var nameText = masked ? 'Hidden Story Trophy (spoiler)' : t.name;
    var descText = masked ? 'Description masked until you earn this trophy.' : (t.description || '');

    var checkCell = document.createElement('div');
    checkCell.className = 'check';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb-' + t.id;
    cb.checked = !!state.checked[t.id];
    cb.setAttribute('aria-label', 'Mark earned: ' + t.name);
    checkCell.appendChild(cb);

    var head = document.createElement('div');
    head.className = 'trophy-head';
    var n = document.createElement('span');
    n.className = 'trophy-name' + (masked ? ' masked' : '');
    n.textContent = nameText;
    head.appendChild(n);
    head.insertAdjacentHTML('beforeend', badgeFor(t));

    var desc = document.createElement('p');
    desc.className = 'trophy-desc' + (masked ? ' masked' : '');
    desc.textContent = descText;

    var body = document.createElement('div');
    body.className = 'trophy-body';
    var g = document.createElement('div');
    g.className = 'trophy-guide';
    g.textContent = t.guide || '';
    body.appendChild(g);

    li.appendChild(checkCell);
    li.appendChild(head);
    li.appendChild(desc);
    li.appendChild(body);

    cb.addEventListener('change', function () {
      if (cb.checked) state.checked[t.id] = true; else delete state.checked[t.id];
      saveProgress();
      renderChecklist();
    });

    return li;
  }

  function renderChecklist() {
    var shown = state.trophies.filter(matches);
    els.trophyList.innerHTML = '';
    shown.forEach(function (t) { els.trophyList.appendChild(trophyRow(t)); });

    var done = 0;
    state.trophies.forEach(function (t) { if (state.checked[t.id]) done++; });
    els.progressFill.style.width = (done / state.trophies.length * 100) + '%';
    els.progressNums.textContent = done + ' / ' + state.trophies.length;

    if (shown.length === 0) {
      els.resultHint.textContent = 'No trophies match the current filters.';
    } else {
      els.resultHint.textContent = 'Showing ' + shown.length + ' of ' + state.trophies.length + ' trophies.';
    }
  }

  function renderRoadmap() {
    if (!state.roadmap) return;
    els.roadmapIntro.textContent = state.roadmap.intro || '';
    var host = els.roadmapStages;
    host.innerHTML = '';
    state.roadmap.stages.forEach(function (st) {
      var div = document.createElement('div');
      div.className = 'stage';

      var head = document.createElement('div');
      head.className = 'stage-head';
      head.insertAdjacentHTML('beforeend',
        '<span class="stage-num">Stage ' + st.number + '</span>' +
        '<span class="stage-title"></span>' +
        (st.chapters ? '<span class="stage-chapters"></span>' : ''));
      head.querySelector('.stage-title').textContent = st.title;
      if (st.chapters) head.querySelector('.stage-chapters').textContent = 'Chapters: ' + st.chapters.join(', ');
      div.appendChild(head);

      if (st.focus) {
        var focus = document.createElement('p');
        focus.className = 'stage-focus';
        focus.textContent = st.focus;
        div.appendChild(focus);
      }

      var chips = document.createElement('div');
      chips.className = 'stage-trophies';
      (st.trophies || []).forEach(function (name) {
        var c = document.createElement('span');
        c.className = 'stage-trophy';
        c.textContent = name;
        chips.appendChild(c);
      });
      div.appendChild(chips);

      if (st.missable_notes) {
        var m = document.createElement('p');
        m.className = 'stage-missable';
        m.textContent = 'Missable: ' + st.missable_notes;
        div.appendChild(m);
      }

      host.appendChild(div);
    });
  }

  function renderSources() {
    if (state.sourcesText) {
      els.sourcesText.innerHTML = '<pre></pre>';
      els.sourcesText.querySelector('pre').textContent = state.sourcesText;
    }
  }

  function showPanel(name) {
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('is-active'); });
    var target = document.getElementById('panel-' + name);
    if (target) target.classList.add('is-active');
    document.querySelectorAll('.tabbtn').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.panel === name);
    });
  }

  function exportProgress() {
    var data = { version: 1, checked: state.checked, spoiler: state.spoiler };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-guide-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data && typeof data === 'object' && data.checked) state.checked = data.checked;
        if (data && data.spoiler) { state.spoiler = true; els.spoilerToggle.checked = true; }
        saveProgress();
        renderChecklist();
      } catch (e) {
        window.alert('Could not read import file: invalid JSON progress.');
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    els.gradeFilter.addEventListener('change', function () {
      state.grade = els.gradeFilter.value;
      renderChecklist();
    });
    els.kindFilter.addEventListener('change', function () {
      state.kind = els.kindFilter.value;
      renderChecklist();
    });
    els.missableToggle.addEventListener('change', function () {
      state.missableOnly = els.missableToggle.checked;
      renderChecklist();
    });
    els.spoilerToggle.addEventListener('change', function () {
      state.spoiler = els.spoilerToggle.checked;
      saveProgress();
      renderChecklist();
    });
    els.exportBtn.addEventListener('click', exportProgress);
    els.importBtn.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function () {
      if (els.importFile.files && els.importFile.files[0]) importProgress(els.importFile.files[0]);
      els.importFile.value = '';
    });
    document.querySelectorAll('.tabbtn').forEach(function (b) {
      b.addEventListener('click', function () { showPanel(b.dataset.panel); });
    });
  }

  function init() {
    loadProgress();
    bindEvents();
    els.spoilerToggle.checked = state.spoiler;
    els.missableToggle.checked = state.missableOnly;

    Promise.all([
      fetch('data/trophies.json').then(function (r) { return r.json(); }),
      fetch('data/roadmap.json').then(function (r) { return r.json(); }),
      fetch('data/sources.md').then(function (r) { return r.text(); })
    ]).then(function (results) {
      state.trophies = results[0].trophies || results[0];
      state.roadmap = results[1];
      state.sourcesText = results[2];
      renderChecklist();
      renderRoadmap();
      renderSources();
    }).catch(function (err) {
      els.resultHint.textContent = 'Failed to load guide data. Serve via a local HTTP server (e.g. python3 -m http.server).';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
