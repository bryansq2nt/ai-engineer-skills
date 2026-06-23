// Phase A — data sources declared in one place (no more single hardcoded file).
const SOURCES = {
  rawReport: 'data/raw-report.txt',
  analysis: 'data/analysis.json',
  evidence: 'data/evidence.json',
  auditRuns: 'data/audit-runs.json',
};
const RAW_URL = SOURCES.rawReport;

// Archetype → emoji (mirrors the ai-fluency skill's prototypes; display-only).
const ARCHETYPE_EMOJI = {
  'Autonomous Agent': '🤖', Architect: '🏗️', Debugger: '🐛',
  Collaborator: '🤝', Sprinter: '⚡',
};

// The Artifacts axis. Same 12 recurring failures the /engineer-audit skill enforces (F1–F12).
// `terms` are scanned against the raw code-review text to mark which patterns it flagged —
// this is the bridge that lets the free-text review sit next to the structured fluency scores.
const FAILURE_CATALOG = [
  { id: 'F1', label: 'Auth fails open', terms: ['fail open', 'fail-open', 'fails open', 'fail-closed', 'api_secret is unset'] },
  { id: 'F2', label: 'Secrets in the browser', terms: ['next_public_api_secret', 'secret via', 'backend secret', 'public “secret”', 'public "secret"'] },
  { id: 'F3', label: 'Hardcoded credentials', terms: ['hardcoded aws', 'hardcoded', 'api key patterns', 'exposed/hardcoded credentials'] },
  { id: 'F4', label: 'HTML / email injection', terms: ['into html emails', 'interpolate user input', 'sanitization', 'escaping'] },
  { id: 'F5', label: 'No tests on risky seams', terms: ['testing discipline', 'no meaningful tests', 'zero test files', 'meaningful automated tests are mostly absent', 'smoke test'] },
  { id: 'F6', label: 'No CI/CD gate', terms: ['ci/cd is mostly missing', 'no ci', 'github actions', 'quality gate'] },
  { id: 'F7', label: 'Type bypass (as any)', terms: ['as any', 'types as documentation', 'generated db types'] },
  { id: 'F8', label: 'Oversized modules', terms: ['files grow too large', 'oversized', '800-line', 'mix auth'] },
  { id: 'F9', label: 'Repo hygiene', terms: ['repo hygiene', 'generated artifacts', 'node_modules', 'duplicated project copies', '.gitignore'] },
  { id: 'F10', label: 'Unpinned Python deps', terms: ['dependency pinning', 'lockfile', 'pinned python', 'reproducib'] },
  { id: 'F11', label: 'No structured logging', terms: ['structured logging', 'console.log', 'observability', 'sentry'] },
  { id: 'F12', label: 'Security review after-the-fact', terms: ['security review before', 'after a bug is noticed', 'security pass', 'threat model'] },
];
const THEME_RULES = [
  { tag: 'profile', label: 'Profile', terms: ['profile', 'verdict'] },
  { tag: 'strengths', label: 'Strengths', terms: ['strengths', 'better', 'keep doing'] },
  { tag: 'weaknesses', label: 'Weaknesses', terms: ['weakness', 'risks', 'stop doing'] },
  { tag: 'patterns', label: 'Patterns', terms: ['patterns', 'architecture', 'coding'] },
  { tag: 'practices', label: 'Practices', terms: ['practices', 'discipline'] },
  { tag: 'tools', label: 'Tools', terms: ['tools', 'workflows', 'ci', 'testing'] },
  { tag: 'learning', label: 'Learning', terms: ['learn', 'next'] },
  { tag: 'plan', label: 'Plans', terms: ['plan', '30-day', '6-month', 'start doing'] },
  { tag: 'risk', label: 'Risk', terms: ['security', 'secrets', 'risks', 'fail-open'] },
];

const state = {
  raw: '',
  sections: [],
  analysis: null,
  evidence: null,
  mode: 'fluency',
  activeFilter: 'all',
  query: '',
  bookmarks: new Set(JSON.parse(localStorage.getItem('feedback-bookmarks') || '[]')),
};

const el = {
  progress: document.querySelector('#progress'),
  toc: document.querySelector('#toc'),
  filters: document.querySelector('#filters'),
  metrics: document.querySelector('#metrics'),
  chart: document.querySelector('#themeChart'),
  sectionsView: document.querySelector('#sectionsView'),
  rawText: document.querySelector('#rawText'),
  rawView: document.querySelector('#rawView'),
  notes: document.querySelector('#notes'),
  notesView: document.querySelector('#notesView'),
  bookmarksView: document.querySelector('#bookmarksView'),
  searchInput: document.querySelector('#searchInput'),
  searchCount: document.querySelector('#searchCount'),
  toast: document.querySelector('#toast'),
  fluencyRoot: document.querySelector('#fluencyRoot'),
  overviewRoot: document.querySelector('#overviewRoot'),
  overviewMode: document.querySelector('#overviewMode'),
  progressRoot: document.querySelector('#progressRoot'),
  progressMode: document.querySelector('#progressMode'),
  fluencyMode: document.querySelector('#fluencyMode'),
  reviewMode: document.querySelector('#reviewMode'),
  reviewActions: document.querySelector('#reviewActions'),
  modeSwitch: document.querySelector('#modeSwitch'),
};

init();

async function init() {
  const response = await fetch(RAW_URL);
  state.raw = await response.text();
  state.sections = parseSections(state.raw);

  // Phase A — pull in the structured ai-fluency data (graceful if absent).
  state.analysis = await fetchJson(SOURCES.analysis);
  state.evidence = await fetchJson(SOURCES.evidence);
  // Phase C — audit runs over time (falls back to a single baseline from the review scan).
  state.auditRuns = await loadAuditRuns();

  renderMetrics();
  renderFilters();
  renderToc();
  renderChart();
  renderSections();
  renderRaw();
  renderBookmarks();
  renderFluency();
  renderOverview();
  renderProgress();
  bindEvents();
  setMode('overview');

  el.notes.value = localStorage.getItem('feedback-notes') || '';
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseSections(raw) {
  const lines = raw.split('\n');
  const starts = [];
  let expectedTopLevel = 1;

  lines.forEach((line, index) => {
    const match = line.match(/^\s{2}(\d+)\.\s+(.+?)\s*$/);
    if (!match) return;
    const sectionNumber = Number(match[1]);
    if (sectionNumber !== expectedTopLevel) return;
    starts.push({ index, number: match[1], title: match[2] });
    expectedTopLevel += 1;
  });

  if (!starts.length) {
    return [{ id: 'section-1', number: '1', title: 'Full Report', text: raw, tags: deriveTags('Full Report', raw), wordCount: countWords(raw) }];
  }

  return starts.map((start, i) => {
    const end = starts[i + 1]?.index ?? lines.length;
    const text = lines.slice(start.index, end).join('\n');
    return {
      id: `section-${start.number}`,
      number: start.number,
      title: start.title,
      text,
      tags: deriveTags(start.title, text),
      wordCount: countWords(text),
    };
  });
}

function deriveTags(title, text) {
  const haystack = `${title}\n${text}`.toLowerCase();
  const tags = THEME_RULES
    .filter((rule) => rule.terms.some((term) => haystack.includes(term)))
    .map((rule) => rule.tag);
  return [...new Set(tags.length ? tags : ['general'])];
}

function labelFor(tag) {
  return THEME_RULES.find((rule) => rule.tag === tag)?.label || titleCase(tag);
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

function renderMetrics() {
  const totalWords = countWords(state.raw);
  const lines = state.raw.split('\n').length;
  const tags = new Set(state.sections.flatMap((section) => section.tags));
  el.metrics.innerHTML = [
    metric(state.sections.length, 'Sections'),
    metric(lines, 'Original lines'),
    metric(totalWords, 'Words preserved'),
    metric(tags.size, 'Derived themes'),
  ].join('');
}

function metric(value, label) {
  return `<div class="metric"><strong>${value.toLocaleString()}</strong><span>${label}</span></div>`;
}

function renderFilters() {
  const counts = tagCounts();
  const pills = [`<button class="filter-pill active" data-filter="all" type="button">All ${state.sections.length}</button>`];
  for (const [tag, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    pills.push(`<button class="filter-pill" data-filter="${tag}" type="button">${labelFor(tag)} ${count}</button>`);
  }
  el.filters.innerHTML = pills.join('');
}

function renderToc() {
  el.toc.innerHTML = state.sections
    .map((section) => `<a class="toc-link" href="#${section.id}">${section.number}. ${escapeHtml(section.title)}</a>`)
    .join('');
}

function renderChart() {
  const counts = tagCounts();
  const max = Math.max(...counts.values(), 1);
  el.chart.innerHTML = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => {
      const width = Math.max(8, Math.round((count / max) * 100));
      return `
        <div class="bar-row">
          <span>${labelFor(tag)}</span>
          <div class="bar"><span style="width:${width}%"></span></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join('');
}

function tagCounts() {
  const counts = new Map();
  for (const section of state.sections) {
    for (const tag of section.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return counts;
}

function renderSections() {
  el.sectionsView.innerHTML = state.sections
    .map((section) => {
      const bookmarked = state.bookmarks.has(section.id);
      return `
        <article class="section-card" id="${section.id}" data-tags="${section.tags.join(',')}" data-text="${escapeAttr(section.text.toLowerCase())}">
          <button class="section-toggle" type="button" aria-expanded="true">
            <span>
              <p class="eyebrow">Section ${section.number}</p>
              <h2 class="section-title">${escapeHtml(section.title)}</h2>
              <span class="section-meta">
                ${section.tags.map((tag) => `<span class="tag ${tag}">${labelFor(tag)}</span>`).join('')}
                <span class="tag">${(section.wordCount ?? countWords(section.text)).toLocaleString()} words</span>
              </span>
            </span>
            <span class="chevron">−</span>
          </button>
          <div class="section-body">
            <div class="section-actions">
              <button class="ghost-button copy-section" type="button" data-section="${section.id}">Copy section</button>
              <button class="ghost-button bookmark-section" type="button" data-section="${section.id}">${bookmarked ? 'Bookmarked' : 'Bookmark'}</button>
            </div>
            <pre class="report-text">${highlight(escapeHtml(section.text), state.query)}</pre>
          </div>
        </article>
      `;
    })
    .join('');
  applyFilters();
}

function renderRaw() {
  el.rawText.textContent = state.raw;
}

// --------------------------------------------------------------------------- //
// Phase A — AI Fluency view (renders structured analysis.json + evidence.json)
// --------------------------------------------------------------------------- //

function setMode(mode) {
  state.mode = mode;
  el.overviewMode.classList.toggle('is-hidden', mode !== 'overview');
  el.progressMode.classList.toggle('is-hidden', mode !== 'progress');
  el.fluencyMode.classList.toggle('is-hidden', mode !== 'fluency');
  el.reviewMode.classList.toggle('is-hidden', mode !== 'review');
  el.reviewActions.classList.toggle('is-hidden', mode !== 'review');
  el.modeSwitch.querySelectorAll('.seg').forEach((seg) =>
    seg.classList.toggle('active', seg.dataset.mode === mode));
  if (mode !== 'review') document.body.classList.remove('focus');
  window.scrollTo({ top: 0 });
}

// Overview — the two feedback axes side by side, with one synthesis line.
function renderOverview() {
  const a = state.analysis;
  const ev = state.evidence;
  const sc = ev?.scores || {};
  const arch = ev?.archetype || {};
  const dims = sc.dimensions_adjusted || {};
  const names = sc.dimension_names || {};
  const skill = a?.skill_map || [];

  const strongest = skill.length ? skill.reduce((m, s) => (s.level > m.level ? s : m)) : null;
  const weakest = Object.keys(dims).length
    ? Object.entries(dims).sort((x, y) => x[1] - y[1])[0]
    : null;
  const emoji = ARCHETYPE_EMOJI[arch.primary] || '◆';

  // Artifacts axis: which F1–F12 patterns the code review flagged.
  const haystack = state.raw.toLowerCase();
  const flagged = FAILURE_CATALOG.map((f) => ({ ...f, hit: f.terms.some((t) => haystack.includes(t)) }));
  const hits = flagged.filter((f) => f.hit).length;
  const total = FAILURE_CATALOG.length;

  const processCard = `
    <article class="ax-card process">
      <p class="eyebrow">Process · How you drive the agent</p>
      <div class="ax-score"><strong>${sc.overall ?? '—'}</strong><span>/100</span>
        <span class="ax-band">${escapeHtml(sc.band || '')}</span></div>
      <p class="ax-arch">${emoji} ${escapeHtml(arch.primary || 'Unknown')}</p>
      <ul class="ax-facts">
        ${strongest ? `<li><span class="ok-dot"></span>Strongest: <strong>${escapeHtml(strongest.competency)}</strong> · L${strongest.level}/5 ${escapeHtml(strongest.level_label || '')}</li>` : ''}
        ${weakest ? `<li><span class="warn-dot"></span>Weakest: <strong>${escapeHtml(names[weakest[0]] || weakest[0])}</strong> · ${weakest[1]}/100</li>` : ''}
      </ul>
      <button class="ghost-button ax-link" data-goto="fluency" type="button">Open AI Fluency →</button>
    </article>`;

  const artifactsCard = `
    <article class="ax-card artifacts">
      <p class="eyebrow">Artifacts · What your code is like</p>
      <div class="ax-score"><strong>${hits}</strong><span>/ ${total} failure patterns flagged</span></div>
      <p class="ax-arch muted">Mapped from the code review to the F1–F12 ledger</p>
      <ul class="ax-failures">
        ${flagged.map((f) => `
          <li class="${f.hit ? 'flagged' : 'clear'}">
            <span class="f-id">${f.id}</span>
            <span class="f-label">${escapeHtml(f.label)}</span>
            <span class="f-status">${f.hit ? 'flagged' : 'clear'}</span>
          </li>`).join('')}
      </ul>
      <button class="ghost-button ax-link" data-goto="review" type="button">Open Code Review →</button>
    </article>`;

  const synthesis = (sc.overall != null)
    ? `<p class="ax-synthesis">You're <strong>${escapeHtml(sc.band || '')}</strong> at <em>driving</em> the agent
       (${sc.overall}/100), but the code review flags <strong>${hits} of ${total}</strong> recurring failure
       patterns in what you <em>ship</em>. Your process is ahead of your artifacts — the discipline lives in
       how you work, not yet in what survives. That gap is exactly what <code>/engineer-start</code> and
       <code>/engineer-audit</code> close.</p>`
    : '';

  el.overviewRoot.innerHTML = `
    <section class="hero-card ax-hero">
      <div>
        <p class="eyebrow">Two Axes Of Feedback</p>
        <h2>Process vs. Artifacts</h2>
        ${synthesis}
      </div>
    </section>
    <div class="ax-grid">${processCard}${artifactsCard}</div>`;
}

// --------------------------------------------------------------------------- //
// Phase C — Progress over time (ingests /engineer-audit runs from audit-runs.json)
// --------------------------------------------------------------------------- //

async function loadAuditRuns() {
  const data = await fetchJson(SOURCES.auditRuns);
  if (data && Array.isArray(data.runs) && data.runs.length) return data.runs;
  return [baselineRunFromScan()]; // fallback: one baseline derived from the review scan
}

function baselineRunFromScan() {
  const haystack = state.raw.toLowerCase();
  const failures = {};
  FAILURE_CATALOG.forEach((f) => {
    failures[f.id] = f.terms.some((t) => haystack.includes(t)) ? 'flagged' : 'clear';
  });
  return {
    date: 'baseline', label: 'Code review (baseline)', source: SOURCES.rawReport,
    fluency_score: state.evidence?.scores?.overall ?? null, failures,
  };
}

const flaggedCount = (run) =>
  FAILURE_CATALOG.filter((f) => (run.failures || {})[f.id] === 'flagged').length;

const runLabel = (run) => run.label || run.date || 'run';

function renderProgress() {
  const runs = state.auditRuns || [];
  const total = FAILURE_CATALOG.length;
  if (!runs.length) {
    el.progressRoot.innerHTML = '<div class="empty-state">No audit runs yet.</div>';
    return;
  }
  const first = runs[0];
  const latest = runs[runs.length - 1];
  const prev = runs.length > 1 ? runs[runs.length - 2] : null;
  const firstN = flaggedCount(first);
  const latestN = flaggedCount(latest);
  const fixedSoFar = firstN - latestN;
  const hasSample = runs.some((r) => r.sample);

  const trend = runs.map((r) => {
    const n = flaggedCount(r);
    const w = Math.max(4, Math.round((n / total) * 100));
    const good = n < firstN;
    return `
      <div class="bar-row">
        <span>${escapeHtml(runLabel(r))}${r.sample ? ' <em class="sample-tag">sample</em>' : ''}</span>
        <div class="bar"><span style="width:${w}%;background:${good ? 'var(--strength)' : 'var(--accent-2)'}"></span></div>
        <strong>${n}/${total}</strong>
      </div>`;
  }).join('');

  const scores = runs.filter((r) => r.fluency_score != null);
  const scoreTrend = scores.length > 1
    ? `<div class="visual-panel"><div class="panel-heading"><div><p class="eyebrow">Process</p><h2>AI Fluency Score</h2></div><p class="muted">higher is better</p></div>
       <div class="chart">${scores.map((r) => `
         <div class="bar-row"><span>${escapeHtml(runLabel(r))}</span>
         <div class="bar"><span style="width:${Math.max(4, r.fluency_score)}%"></span></div>
         <strong>${r.fluency_score}</strong></div>`).join('')}</div></div>`
    : '';

  const statusList = FAILURE_CATALOG.map((f) => {
    const st = (latest.failures || {})[f.id] || 'clear';
    const prevSt = prev ? (prev.failures || {})[f.id] : null;
    const newlyFixed = prevSt === 'flagged' && st === 'fixed';
    const tail = st === 'flagged'
      ? '<span class="f-fix">→ /engineer-start</span>'
      : `<span class="f-status ${st === 'fixed' ? 'fixed-s' : ''}">${st}</span>`;
    return `
      <li class="prog-${st}">
        <span class="f-id">${f.id}</span>
        <span class="f-label">${escapeHtml(f.label)}</span>
        ${newlyFixed ? '<span class="delta">✓ just fixed</span>' : ''}
        ${tail}
      </li>`;
  }).join('');

  el.progressRoot.innerHTML = `
    <section class="hero-card ax-hero">
      <div>
        <p class="eyebrow">Close The Loop · Progress Over Time</p>
        <h2>${fixedSoFar > 0 ? `${fixedSoFar} of ${firstN} failures fixed` : `${latestN} of ${total} failures still open`}</h2>
        <p class="ax-synthesis">Across ${runs.length} audit${runs.length === 1 ? '' : 's'}, flagged failures went from
          <strong>${firstN}</strong> to <strong>${latestN}</strong>. Each new <code>/engineer-audit</code> run you append
          extends this trend — the goal is every F-pattern at <em>clear</em> or <em>fixed</em>.</p>
        ${hasSample ? '<p class="muted">Runs marked “sample” are illustrative until you append real <code>/engineer-audit</code> output to <code>audit-runs.json</code>.</p>' : ''}
      </div>
    </section>

    <div class="visual-panel">
      <div class="panel-heading"><div><p class="eyebrow">Artifacts</p><h2>Failures Flagged Per Audit</h2></div><p class="muted">lower is better</p></div>
      <div class="chart">${trend}</div>
    </div>
    ${scoreTrend}

    <div class="visual-panel">
      <div class="panel-heading"><div><p class="eyebrow">Latest · ${escapeHtml(runLabel(latest))}</p><h2>Current F1–F12 Status</h2></div></div>
      <ul class="prog-list">${statusList}</ul>
    </div>`;
}

function renderFluency() {
  const a = state.analysis;
  const ev = state.evidence;
  if (!a && !ev) {
    el.fluencyRoot.innerHTML =
      `<div class="empty-state">No AI Fluency data found.<br>
       Expected <code>${escapeHtml(SOURCES.analysis)}</code> and
       <code>${escapeHtml(SOURCES.evidence)}</code>.</div>`;
    return;
  }
  const sc = ev?.scores || {};
  const meta = ev?.meta || {};
  const arch = ev?.archetype || {};
  const dims = sc.dimensions_adjusted || {};
  const names = sc.dimension_names || {};
  const emoji = ARCHETYPE_EMOJI[arch.primary] || '◆';

  const heroStats = [
    [meta.real_prompts, 'Prompts analyzed'],
    [ev?.behavior ? Object.values(ev.behavior.tool_usage || {}).reduce((s, n) => s + n, 0) : null, 'Tool calls'],
    [meta.sessions, 'Sessions'],
    [meta.active_hours, 'Active hours'],
    [meta.span_days, 'Days span'],
  ].filter(([v]) => v != null);

  const dimRows = Object.keys(dims).length
    ? `<div class="visual-panel">
         <div class="panel-heading"><div>
           <p class="eyebrow">Measured Deterministically</p><h2>Five Dimensions</h2>
         </div><p class="muted">0–100, confidence-adjusted</p></div>
         <div class="chart">
         ${Object.entries(dims).sort((x, y) => y[1] - x[1]).map(([k, v]) => `
           <div class="bar-row">
             <span>${escapeHtml(names[k] || k)}</span>
             <div class="bar"><span style="width:${Math.max(4, v)}%;${v < 40 ? 'background:var(--risk)' : ''}"></span></div>
             <strong>${v}</strong>
           </div>`).join('')}
         </div>
       </div>`
    : '';

  const skillCards = (a?.skill_map || []).map((s) => `
    <article class="fl-card">
      <div class="fl-card-head">
        <h3>${escapeHtml(s.competency)}</h3>
        <span class="level-pill">L${s.level}/5 · ${escapeHtml(s.level_label || '')}</span>
      </div>
      <p>${escapeHtml(s.summary || '')}</p>
      ${(s.evidence || []).slice(0, 2).map((q) => `<blockquote>${escapeHtml(String(q))}</blockquote>`).join('')}
      ${s.next_move ? `<p class="fl-next"><strong>Next move:</strong> ${escapeHtml(s.next_move)}</p>` : ''}
    </article>`).join('');

  const growthCards = (a?.top_growth || []).map((g) => `
    <article class="fl-card growth">
      <h3>${escapeHtml(g.title || '')}</h3>
      ${g.why ? `<p>${escapeHtml(g.why)}</p>` : ''}
      ${g.how ? `<p class="muted">${escapeHtml(g.how)}</p>` : ''}
      <div class="ba">
        <div class="ba-col before"><span class="ba-tag">Before</span><pre>${escapeHtml(g.example_before || '')}</pre></div>
        <div class="ba-col after"><span class="ba-tag">After</span><pre>${escapeHtml(g.example_after || '')}</pre></div>
      </div>
    </article>`).join('');

  const strengths = (a?.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');

  el.fluencyRoot.innerHTML = `
    <section class="hero-card fl-hero">
      <div>
        <p class="eyebrow">How You Drive The Agent</p>
        <div class="fl-score"><strong>${sc.overall ?? '—'}</strong><span>/100 · ${escapeHtml(sc.band || '')}</span></div>
        <p class="fl-arch">${emoji} ${escapeHtml(arch.primary || 'Unknown')}${arch.secondary ? ` <span class="muted">· with a ${escapeHtml(arch.secondary)} streak</span>` : ''}</p>
        ${a?.overall_read ? `<p class="fl-read">${escapeHtml(a.overall_read)}</p>` : ''}
      </div>
      <div class="metric-grid">
        ${heroStats.map(([v, l]) => metric(typeof v === 'number' ? v : v, l)).join('')}
      </div>
    </section>
    ${dimRows}
    ${skillCards ? `<div class="panel-heading fl-section-head"><div><p class="eyebrow">Analyzed By Claude</p><h2>Skill Map — the four competencies</h2></div></div><div class="fl-grid">${skillCards}</div>` : ''}
    ${growthCards ? `<div class="panel-heading fl-section-head"><div><p class="eyebrow">Highest Leverage</p><h2>How To Grow</h2></div></div><div class="fl-stack">${growthCards}</div>` : ''}
    ${strengths ? `<div class="visual-panel"><div class="panel-heading"><div><p class="eyebrow">Foundation</p><h2>What You Already Do Well</h2></div></div><ul class="fl-strengths">${strengths}</ul></div>` : ''}
  `;
}

function renderBookmarks() {
  const bookmarked = state.sections.filter((section) => state.bookmarks.has(section.id));
  if (!bookmarked.length) {
    el.bookmarksView.innerHTML = '<div class="empty-state">No bookmarked sections yet.</div>';
    return;
  }

  el.bookmarksView.innerHTML = bookmarked
    .map((section) => `
      <article class="section-card">
        <button class="section-toggle" type="button" aria-expanded="true">
          <span>
            <p class="eyebrow">Bookmarked Section ${section.number}</p>
            <h2 class="section-title">${escapeHtml(section.title)}</h2>
          </span>
          <span class="chevron">−</span>
        </button>
        <div class="section-body">
          <div class="section-actions">
            <button class="ghost-button copy-section" type="button" data-section="${section.id}">Copy section</button>
            <button class="ghost-button bookmark-section" type="button" data-section="${section.id}">Remove bookmark</button>
          </div>
          <pre class="report-text">${escapeHtml(section.text)}</pre>
        </div>
      </article>
    `)
    .join('');
}

function bindEvents() {
  document.querySelector('#expandAll').addEventListener('click', () => setAllCollapsed(false));
  document.querySelector('#collapseAll').addEventListener('click', () => setAllCollapsed(true));
  document.querySelector('#focusToggle').addEventListener('click', () => document.body.classList.toggle('focus'));
  document.querySelector('.copy-raw').addEventListener('click', () => copyText(state.raw, 'Full report copied'));
  document.querySelector('#clearNotes').addEventListener('click', () => {
    el.notes.value = '';
    localStorage.removeItem('feedback-notes');
    showToast('Notes cleared');
  });

  el.notes.addEventListener('input', () => localStorage.setItem('feedback-notes', el.notes.value));
  el.searchInput.addEventListener('input', () => {
    state.query = el.searchInput.value.trim();
    renderSections();
    updateSearchCount();
  });

  el.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter-pill').forEach((pill) => pill.classList.toggle('active', pill === button));
    applyFilters();
  });

  el.modeSwitch.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (button) setMode(button.dataset.mode);
  });

  document.querySelector('.content-tools').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    document.querySelector(`#${button.dataset.view}View`).classList.add('active');
  });

  document.body.addEventListener('click', (event) => {
    const goto = event.target.closest('[data-goto]');
    if (goto) setMode(goto.dataset.goto);

    const toggle = event.target.closest('.section-toggle');
    if (toggle) toggleSection(toggle);

    const copy = event.target.closest('.copy-section');
    if (copy) {
      const section = state.sections.find((item) => item.id === copy.dataset.section);
      if (section) copyText(section.text, 'Section copied');
    }

    const bookmark = event.target.closest('.bookmark-section');
    if (bookmark) toggleBookmark(bookmark.dataset.section);
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('scroll', updateActiveToc, { passive: true });
}

function toggleSection(toggle) {
  const body = toggle.nextElementSibling;
  const isOpen = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!isOpen));
  toggle.querySelector('.chevron').textContent = isOpen ? '+' : '−';
  body.hidden = isOpen;
}

function setAllCollapsed(collapsed) {
  document.querySelectorAll('.section-toggle').forEach((toggle) => {
    const body = toggle.nextElementSibling;
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.querySelector('.chevron').textContent = collapsed ? '+' : '−';
    body.hidden = collapsed;
  });
}

function toggleBookmark(sectionId) {
  if (state.bookmarks.has(sectionId)) {
    state.bookmarks.delete(sectionId);
    showToast('Bookmark removed');
  } else {
    state.bookmarks.add(sectionId);
    showToast('Section bookmarked');
  }
  localStorage.setItem('feedback-bookmarks', JSON.stringify([...state.bookmarks]));
  renderSections();
  renderBookmarks();
}

function applyFilters() {
  let visible = 0;
  const query = state.query.toLowerCase();
  document.querySelectorAll('.section-card[id]').forEach((card) => {
    const tagMatch = state.activeFilter === 'all' || card.dataset.tags.split(',').includes(state.activeFilter);
    const searchMatch = !query || card.dataset.text.includes(query);
    const shouldShow = tagMatch && searchMatch;
    card.classList.toggle('hidden', !shouldShow);
    if (shouldShow) visible += 1;
  });
  updateSearchCount(visible);
}

function updateSearchCount(visible) {
  const query = state.query;
  if (!query) {
    el.searchCount.textContent = state.activeFilter === 'all' ? 'No search active' : `${visible ?? state.sections.length} matching sections`;
    return;
  }
  const matches = [...state.raw.matchAll(new RegExp(escapeRegExp(query), 'gi'))].length;
  el.searchCount.textContent = `${matches} text matches across ${visible ?? 0} sections`;
}

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max <= 0 ? 0 : (window.scrollY / max) * 100;
  el.progress.style.width = `${pct}%`;
}

function updateActiveToc() {
  let activeId = state.sections[0]?.id;
  for (const section of state.sections) {
    const node = document.getElementById(section.id);
    if (node && node.getBoundingClientRect().top < 180) activeId = section.id;
  }
  document.querySelectorAll('.toc-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
  });
}

function highlight(escapedText, query) {
  if (!query) return escapedText;
  return escapedText.replace(new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi'), '<mark>$1</mark>');
}

function copyText(text, message) {
  navigator.clipboard.writeText(text).then(() => showToast(message));
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('visible');
  setTimeout(() => el.toast.classList.remove('visible'), 1800);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('\n', '&#10;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
