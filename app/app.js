// =============================================================================
// GTA VI Trophy Guide — app logic.
// A small, dependency-free ES module. It loads local data files (trophies.json,
// roadmap.json, sources.md), keeps progress in localStorage, and renders the
// Checklist / Roadmap / Sources tabs. Everything is offline: no network calls.
// =============================================================================

// localStorage keys for the tracker's state.
const STORAGE_KEY = 'gta6-trophy-progress-v1';
const PREFS_KEY = 'gta6-trophy-prefs-v1';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  trophies: [],
  roadmap: [],
  sourcesText: '',
  earned: new Set(),
  grade: 'all',
  kind: 'all',
  missableOnly: false,
  spoiler: false,
  activeTab: 'checklist',
};

// ---------------------------------------------------------------------------
// Load the local data files.
// ---------------------------------------------------------------------------
async function loadData() {
  const [trophyRes, roadmapRes, sourcesRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
    fetch('data/sources.md'),
  ]);
  const trophyData = await trophyRes.json();
  state.trophies = Array.isArray(trophyData.trophies) ? trophyData.trophies : trophyData;
  state.roadmap = await roadmapRes.json();
  state.sourcesText = await sourcesRes.text();
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    state.earned = new Set(Array.isArray(saved) ? saved : []);
  } catch {
    state.earned = new Set();
  }
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    state.spoiler = Boolean(prefs.spoiler);
    state.grade = prefs.grade ?? 'all';
    state.kind = prefs.kind ?? 'all';
    state.missableOnly = Boolean(prefs.missableOnly);
  } catch {
    // leave defaults
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.earned]));
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    spoiler: state.spoiler,
    grade: state.grade,
    kind: state.kind,
    missableOnly: state.missableOnly,
  }));
}

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badge(text, cls) {
  const b = el('span', 'badge ' + cls, text);
  return b;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
function trophyVisible(t) {
  if (state.grade !== 'all' && t.grade !== state.grade) return false;
  if (state.kind !== 'all' && t.kind !== state.kind) return false;
  if (state.missableOnly && !t.missable) return false;
  return true;
}

// Spoiler mode hides the name/description of story trophies not yet earned.
function visibleName(t) {
  if (state.spoiler && t.kind === 'story' && !state.earned.has(t.name)) {
    return '??? (spoiler — earn to reveal)';
  }
  return t.name;
}

function visibleDescription(t) {
  if (state.spoiler && t.kind === 'story' && !state.earned.has(t.name)) {
    return 'This trophy is hidden behind the story. Complete the related story content to reveal it.';
  }
  return t.description;
}

// ---------------------------------------------------------------------------
// Rendering: checklist
// ---------------------------------------------------------------------------
function renderChecklist() {
  const container = document.getElementById('trophy-list');
  container.replaceChildren();

  const filtered = state.trophies.filter(trophyVisible);
  const hint = document.getElementById('list-hint');
  hint.textContent = `${filtered.length} of ${state.trophies.length} trophies shown`;

  for (const t of filtered) {
    container.append(renderTrophy(t));
  }
  updateProgress();
  savePrefs();
}

function renderTrophy(t) {
  const card = el('article', 'trophy grade-' + t.grade);

  // header row
  const head = el('div', 'trophy-head');

  const check = el('input');
  check.type = 'checkbox';
  check.className = 'trophy-check';
  check.checked = state.earned.has(t.name);
  check.addEventListener('change', () => {
    if (check.checked) state.earned.add(t.name);
    else state.earned.delete(t.name);
    saveProgress();
    updateProgress();
    // Refresh spoiler reveal state on this row.
    const nameNode = card.querySelector('.trophy-name');
    const descNode = card.querySelector('.trophy-desc');
    if (nameNode) nameNode.textContent = visibleName(t);
    if (descNode) descNode.textContent = visibleDescription(t);
  });

  const titleWrap = el('div', 'trophy-title');
  const name = el('div', 'trophy-name', visibleName(t));
  const desc = el('div', 'trophy-desc', visibleDescription(t));
  if (state.spoiler && t.kind === 'story' && !state.earned.has(t.name)) {
    name.classList.add('trophy-spoiler');
    desc.classList.add('trophy-spoiler');
  }
  titleWrap.append(name, desc);

  head.append(check, titleWrap);
  card.append(head);

  // badges
  const badges = el('div', 'badges');
  badges.append(
    badge(t.grade, 'grade grade-' + t.grade),
    badge(t.kind, 'kind'),
  );
  if (t.missable) badges.append(badge('missable', 'missable'));
  if (t.hidden) badges.append(badge('hidden', 'hidden'));
  card.append(badges);

  // guide + sources
  const guide = el('div', 'trophy-guide');
  guide.append(el('div', 'guide-label', 'How to get it'));
  const p = el('p', '', t.guide);
  guide.append(p);
  const srcLine = el('div', 'sources-line');
  const label = el('span', '', 'Sources: ');
  const links = (t.sources || []).map((key) => makeSourceLink(key)).filter(Boolean);
  srcLine.append(label, ...links);
  guide.append(srcLine);
  card.append(guide);

  return card;
}

// Map a source key (e.g. "1") to an anchor from sources.md, if we can parse it.
const sourceMap = new Map();
function parseSources() {
  sourceMap.clear();
  const lines = state.sourcesText.split('\n');
  let currentNum = null;
  for (const line of lines) {
    const m = /^\s*(\d+)[.)]\s*(.*?)\s*[-\u2013]\s*(https?:\/\/\S+)\s*$/.exec(line);
    if (m) {
      sourceMap.set(m[1], { label: m[2], url: m[3] });
      currentNum = m[1];
    } else if (currentNum && !sourceMap.has(currentNum)) {
      const urlMatch = /(https?:\/\/\S+)/.exec(line);
      if (urlMatch) {
        sourceMap.set(currentNum, { label: line.trim(), url: urlMatch[1] });
      }
    }
  }
}

function makeSourceLink(key) {
  const s = sourceMap.get(String(key));
  if (!s) return null;
  const a = el('a', '', `[${key}] ${s.label}`);
  a.href = s.url;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

// ---------------------------------------------------------------------------
// Progress summary
// ---------------------------------------------------------------------------
function updateProgress() {
  const earned = state.earned.size;
  document.getElementById('progress-count').textContent = String(earned);
  const fill = document.getElementById('progress-fill');
  fill.style.width = Math.round((earned / state.trophies.length) * 100) + '%';
  renderRoadmapEarned();
}

// ---------------------------------------------------------------------------
// Rendering: roadmap
// ---------------------------------------------------------------------------
function renderRoadmapEarned() {
  document.querySelectorAll('.stage-trophy').forEach((node) => {
    const name = node.getAttribute('data-name');
    if (name) node.classList.toggle('earned', state.earned.has(name));
  });
}

function renderRoadmap() {
  const container = document.getElementById('roadmap-list');
  container.replaceChildren();
  for (const stage of state.roadmap) {
    container.append(renderStage(stage));
  }
}

function renderStage(stage) {
  const section = el('div', 'stage');

  const head = el('div', 'stage-head');
  head.append(el('div', 'stage-num', String(stage.stage)));
  const titleWrap = el('div');
  titleWrap.append(el('div', 'stage-title', stage.title));
  titleWrap.append(el('p', 'stage-summary', stage.summary));
  head.append(titleWrap);
  section.append(head);

  if (stage.missableWarnings && stage.missableWarnings.length) {
    const warn = el('div', 'stage-warning');
    warn.append(el('strong', '', '⚠ Missable: '));
    warn.append(document.createTextNode(stage.missableWarnings.join(' ')));
    section.append(warn);
  }

  const chips = el('div', 'stage-trophies');
  for (const id of stage.trophyIds) {
    const t = state.trophies.find((x) => String(x.id) === String(id));
    if (!t) continue;
    const chip = el('button', 'stage-trophy', t.name);
    chip.type = 'button';
    chip.setAttribute('data-name', t.name);
    if (state.earned.has(t.name)) chip.classList.add('earned');
    chip.addEventListener('click', () => switchToChecklist(t.name));
    chips.append(chip);
  }
  section.append(chips);
  return section;
}

function switchToChecklist(name) {
  state.activeTab = 'checklist';
  setActiveTab('checklist');
  if (name) {
    const card = [...document.querySelectorAll('.trophy')].find((c) =>
      c.querySelector('.trophy-name')?.textContent === name || c.querySelector('.trophy-name')?.textContent === '??? (spoiler — earn to reveal)'
    );
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ---------------------------------------------------------------------------
// Rendering: sources
// ---------------------------------------------------------------------------
function renderSources() {
  const container = document.getElementById('sources-md');
  container.replaceChildren();
  const h2 = el('h2', '', 'Sources');
  container.append(h2);
  const intro = el('p', '', 'Each trophy row cites one or more of these sources. Links open only when you follow them; the app itself fetches nothing from the network.');
  container.append(intro);

  const ol = el('ol');
  const lines = state.sourcesText.split('\n');
  let currentItem = null;
  for (const line of lines) {
    const m = /^\s*(\d+)[.)]\s*(.*)$/.exec(line);
    if (m) {
      if (currentItem) ol.append(currentItem);
      currentItem = el('li');
      const text = m[2].replace(/\s+[-\u2013]\s*(https?:\/\/\S+)\s*$/, '');
      currentItem.append(document.createTextNode(text + ' '));
      const urlMatch = /(https?:\/\/\S+)/.exec(line);
      if (urlMatch) {
        const a = el('a', '', urlMatch[1]);
        a.href = urlMatch[1];
        a.target = '_blank';
        a.rel = 'noopener';
        currentItem.append(a);
      }
    }
  }
  if (currentItem) ol.append(currentItem);
  container.append(ol);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function setActiveTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.getAttribute('data-panel') === tab);
  });
  if (tab === 'roadmap') renderRoadmap();
  if (tab === 'sources') renderSources();
}

// ---------------------------------------------------------------------------
// Export / import / reset
// ---------------------------------------------------------------------------
function exportProgress() {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    earned: [...state.earned],
  }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data.earned ?? []);
  state.earned = new Set(list);
  saveProgress();
  updateProgress();
  renderChecklist();
}

function resetProgress() {
  if (confirm('Clear all earned progress?')) {
    state.earned = new Set();
    saveProgress();
    updateProgress();
    renderChecklist();
  }
}

// ---------------------------------------------------------------------------
// Wire up controls and boot.
// ---------------------------------------------------------------------------
function wireEvents() {
  document.getElementById('filter-grade').addEventListener('change', (e) => {
    state.grade = e.target.value;
    savePrefs(); renderChecklist();
  });
  document.getElementById('filter-kind').addEventListener('change', (e) => {
    state.kind = e.target.value;
    savePrefs(); renderChecklist();
  });
  document.getElementById('filter-missable').addEventListener('change', (e) => {
    state.missableOnly = e.target.checked;
    savePrefs(); renderChecklist();
  });
  document.getElementById('filter-spoiler').addEventListener('change', (e) => {
    state.spoiler = e.target.checked;
    savePrefs(); renderChecklist();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('reset-btn').addEventListener('click', resetProgress);
  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
    e.target.value = '';
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab')));
  });

  // restore filter controls from saved prefs
  document.getElementById('filter-grade').value = state.grade;
  document.getElementById('filter-kind').value = state.kind;
  document.getElementById('filter-missable').checked = state.missableOnly;
  document.getElementById('filter-spoiler').checked = state.spoiler;
}

async function boot() {
  await loadData();
  loadProgress();
  parseSources();
  wireEvents();
  renderChecklist();
  setActiveTab('checklist');
}

boot();
