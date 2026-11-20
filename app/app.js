// app/app.js — the Leonida Trophy Tracker.
// Pure client-side ES module: loads its data from app/data/ (relative URLs) and saves
// progress to localStorage. No network requests, no external assets.

const STORAGE_KEY = 'leonida-trophy-earned';
const CHECKLIST_TAB = 'checklist';

const gradeOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

// DOM handles.
const rowsBody = document.getElementById('trophy-rows');
const emptyNote = document.getElementById('check-empty');
const progressChip = document.getElementById('progress-chip');
const gradeFilter = document.getElementById('filter-grade');
const kindFilter = document.getElementById('filter-kind');
const missableFilter = document.getElementById('filter-missable');
const spoilerToggle = document.getElementById('filter-spoiler');
const exportBtn = document.getElementById('btn-export');
const importFile = document.getElementById('file-import');
const roadmapRoot = document.getElementById('roadmap-root');
const sourcesRoot = document.getElementById('sources-root');

// Data + state.
let trophies = [];
let roadmap = null;
let sourceLinks = {}; // key -> { label, url }
let earned = new Set(loadEarned());

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function gradeBadge(grade) {
  const span = document.createElement('span');
  span.className = `badge ${grade}`;
  span.textContent = grade;
  return span;
}

function sourceKeyToUrl(key) {
  const s = sourceLinks[key];
  return s ? s.url : null;
}

function linkifySources(text) {
  // text looks like "Sources: official list; PowerPyx." -> turn source tokens into links.
  const parts = text.split(/:\s*/);
  if (parts.length < 2) return text;
  const label = parts[0];
  const rest = parts.slice(1).join(': ');
  const frag = document.createDocumentFragment();
  frag.append(document.createTextNode(label + ': '));
  const tokens = rest.split(/[.;]\s*/).filter(Boolean);
  tokens.forEach((token, i) => {
    const clean = token.trim();
    const key = Object.keys(sourceLinks).find((k) => clean.toLowerCase().includes(k.toLowerCase()));
    if (key) {
      const a = document.createElement('a');
      a.href = sourceLinks[key].url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = clean;
      frag.append(a);
    } else {
      frag.append(document.createTextNode(clean));
    }
    if (i < tokens.length - 1) frag.append(document.createTextNode('; '));
  });
  return frag;
}

function buildGuide(guideText) {
  const wrap = document.createElement('div');
  wrap.className = 'guide';
  const lines = guideText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^Sources:/i.test(trimmed)) {
      const sourcesLine = document.createElement('div');
      sourcesLine.className = 'sources-line';
      sourcesLine.append(linkifySources(trimmed));
      wrap.append(sourcesLine);
    } else {
      const step = document.createElement('span');
      step.className = 'step';
      step.textContent = trimmed;
      wrap.append(step);
    }
  }
  return wrap;
}

function matchesFilters(t) {
  if (gradeFilter.value !== 'all' && t.grade !== gradeFilter.value) return false;
  if (kindFilter.value !== 'all' && t.kind !== kindFilter.value) return false;
  if (missableFilter.checked && !t.missable) return false;
  return true;
}

function renderChecklist() {
  rowsBody.replaceChildren();
  const visible = trophies.filter(matchesFilters);
  for (const t of visible) {
    const isEarned = earned.has(t.id);
    const tr = document.createElement('tr');
    tr.dataset.id = String(t.id);
    if (isEarned) tr.classList.add('is-earned');
    if (spoilerToggle.checked) tr.classList.add('spoiler');

    // Earned checkbox.
    const tdEarned = document.createElement('td');
    tdEarned.className = 'col-earned';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned;
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned();
      renderChecklist();
    });
    tdEarned.append(box);

    // Name + description.
    const tdTrophy = document.createElement('td');
    tdTrophy.className = 'col-trophy';
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = isEarned || !spoilerToggle.checked || !t.hidden ? t.name : '???.';
    tdTrophy.append(name);
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = isEarned || !spoilerToggle.checked || !t.hidden ? t.description : 'Hidden until earned.';
    tdTrophy.append(desc);

    // Grade + missable bad.
    const tdGrade = document.createElement('td');
    tdGrade.className = 'col-grade';
    tdGrade.append(gradeBadge(t.grade));
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'missable-flag';
      flag.textContent = 'missable';
      tdGrade.append(flag);
    }

    // Guide.
    const tdGuide = document.createElement('td');
    tdGuide.className = 'col-guide';
    tdGuide.append(buildGuide(t.guide));

    tr.append(tdEarned, tdTrophy, tdGrade, tdGuide);
    rowsBody.append(tr);
  }
  emptyNote.hidden = visible.length > 0;
  const total = trophies.length;
  progressChip.textContent = `${earned.size} / ${total} earned`;
}

function renderRoadmap() {
  if (!roadmap) return;
  roadmapRoot.replaceChildren();
  const note = document.createElement('p');
  note.className = 'roadmap-note';
  note.textContent = roadmap.note;
  roadmapRoot.append(note);
  for (const stage of roadmap.stages) {
    const card = document.createElement('section');
    card.className = 'roadmap-stage';

    const h3 = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.id;
    const title = document.createElement('span');
    title.textContent = stage.name;
    h3.append(num, title);

    const p = document.createElement('p');
    p.textContent = stage.description;

    card.append(h3, p);

    for (const warn of stage.missable) {
      const w = document.createElement('div');
      w.className = 'missable-warn';
      w.textContent = '⚠ ' + warn;
      card.append(w);
    }

    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.trophies) {
      const t = trophies.find((x) => x.id === id);
      if (!t) continue;
      const chip = document.createElement('span');
      chip.className = `badge ${t.grade}`;
      chip.textContent = t.name;
      chip.title = t.description;
      chips.append(chip);
    }
    card.append(chips);
    roadmapRoot.append(card);
  }
}

function renderSources() {
  // Render the plain markdown list as text with clickable URLs.
  sourcesRoot.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = 'Where the facts come from';
  sourcesRoot.append(h2);
  for (const key of Object.keys(sourceLinks)) {
    const s = sourceLinks[key];
    const h3 = document.createElement('h3');
    h3.textContent = key;
    const p = document.createElement('p');
    p.textContent = s.label;
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.url;
    p.append(document.createTextNode(' '), a);
    sourcesRoot.append(h3, p);
  }
}

async function loadSourceLinks() {
  const text = await (await fetch('data/sources.md')).text();
  const re = /^- \*\*([\w]+)\*\* — (.+?)\.\s+(https?:\/\/\S+)\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    sourceLinks[m[1]] = { label: m[2], url: m[3] };
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      document.querySelectorAll('.panel').forEach((panel) => {
        panel.classList.toggle('is-active', panel.id === `panel-${tab.dataset.tab}`);
      });
    });
  });
}

function setupExport() {
  exportBtn.addEventListener('click', () => {
    const payload = { app: 'leonida-trophy-tracker', version: 1, earned: [...earned].sort((a, b) => a - b) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function setupImport() {
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const ids = Array.isArray(payload) ? payload : payload.earned;
      earned = new Set(ids.filter((n) => Number.isInteger(n)));
      saveEarned();
      renderChecklist();
    } catch {
      alert('That file is not a valid progress export.');
    }
    importFile.value = '';
  });
}

function bindFilters() {
  for (const el of [gradeFilter, kindFilter, missableFilter, spoilerToggle]) {
    el.addEventListener('change', renderChecklist);
  }
}

async function boot() {
  const [trophyRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophyDoc = await trophyRes.json();
  trophies = trophyDoc.trophies;
  roadmap = await roadmapRes.json();

  await loadSourceLinks();

  setupTabs();
  setupExport();
  setupImport();
  bindFilters();
  renderChecklist();
  renderRoadmap();
  renderSources();
}

boot();
