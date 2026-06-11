// Phase 7b - Docs Portal: floating frosted-glass window, draggable by its
// header and resizable from the corner. Collapsible file tree on the left
// (skills/, souls/, memory/, docs/, prompts/), markdown rendered on the right
// (built-in lightweight renderer, no deps). Read-only. States: skeleton
// shimmer while loading, "Docs unavailable - adapter offline" on fetch
// failure, "No files in this folder" when empty.

let root = null, treeCol = null, viewCol = null, srcEl = null;
let onCloseCb = null, loaded = false;

export function initDocs(opts = {}) {
  onCloseCb = opts.onClose ?? null;
  root = document.createElement('div');
  root.id = 'docs-panel';
  root.className = 'float-panel';
  root.style.display = 'none';
  root.innerHTML = `
    <div class="sp-head" title="drag to move">
      <b>&#128196; Docs</b><span class="sp-src"></span>
      <button class="pp-close" title="close">&#10005;</button>
    </div>
    <div class="docs-cols">
      <div class="docs-tree-col"></div>
      <div class="docs-view-col"><div class="pp-wait">select a file on the left</div></div>
    </div>`;
  document.body.appendChild(root);
  treeCol = root.querySelector('.docs-tree-col');
  viewCol = root.querySelector('.docs-view-col');
  srcEl = root.querySelector('.sp-src');
  root.querySelector('.pp-close').onclick = () => { toggleDocs(false); if (onCloseCb) onCloseCb(); };

  // drag by header (Phase 7b)
  const head = root.querySelector('.sp-head');
  head.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const r0 = root.getBoundingClientRect();
    const dx = e.clientX - r0.left, dy = e.clientY - r0.top;
    const move = ev => {
      root.style.left = Math.min(Math.max(0, ev.clientX - dx), innerWidth - 120) + 'px';
      root.style.top = Math.min(Math.max(0, ev.clientY - dy), innerHeight - 60) + 'px';
      root.style.right = 'auto'; root.style.bottom = 'auto';
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });
  return { toggle: toggleDocs };
}

export function toggleDocs(on) {
  if (!root) return;
  root.style.display = on ? 'flex' : 'none';
  if (on && !loaded) loadTree();
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const skeleton = n => '<div class="skel-wrap">' +
  Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${88 - (i * 13) % 40}%"></div>`).join('') + '</div>';

async function loadTree() {
  treeCol.innerHTML = skeleton(8);
  let data;
  try { data = await fetch('/api/docs/tree').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch {
    treeCol.innerHTML = '<div class="pp-wait">Docs unavailable &mdash; adapter offline</div>';
    return;
  }
  loaded = true;
  const any = data.roots?.some(r => r.available && r.entries.length);
  if (!any && data.docsUrl) {                       // optional Fumadocs iframe fallback
    root.querySelector('.docs-cols').innerHTML =
      `<iframe class="docs-frame" src="${esc(data.docsUrl)}" title="docs"></iframe>`;
    srcEl.textContent = data.docsUrl;
    return;
  }
  treeCol.innerHTML = (data.roots ?? []).map(r => `
    <div class="dt-root">${esc(r.name)}/</div>
    ${r.available && r.entries.length ? renderEntries(r.entries, 0)
      : `<div class="dt-empty">${r.available ? 'No files in this folder' : 'unavailable'}</div>`}`).join('');
  for (const el of treeCol.querySelectorAll('.dt-item[data-path]'))
    el.onclick = () => openFile(el.dataset.path);
  for (const el of treeCol.querySelectorAll('.dt-item.dt-dir'))
    el.onclick = () => el.parentElement.classList.toggle('dt-open');
}

function renderEntries(entries, depth) {
  if (!entries?.length) return `<div class="dt-empty" style="margin-left:${depth * 12}px">No files in this folder</div>`;
  return entries.map(e => e.dir
    ? `<div class="dt-folder ${depth === 0 ? 'dt-open' : ''}" style="margin-left:${depth * 12}px">
         <div class="dt-item dt-dir">&#9656; ${esc(e.name)}/</div>
         <div class="dt-children">${renderEntries(e.children, depth + 1)}</div></div>`
    : `<div class="dt-item" data-path="${esc(e.path)}" style="margin-left:${depth * 12}px">${esc(e.name)}</div>`
  ).join('');
}

async function openFile(p) {
  srcEl.textContent = p;
  for (const x of treeCol.querySelectorAll('.dt-item.on')) x.classList.remove('on');
  const sel = treeCol.querySelector(`.dt-item[data-path="${CSS.escape(p)}"]`);
  if (sel) sel.classList.add('on');
  viewCol.innerHTML = skeleton(10);
  let data;
  try { data = await fetch('/api/docs/file?path=' + encodeURIComponent(p)).then(r => r.json()); }
  catch { viewCol.innerHTML = '<div class="pp-wait">Docs unavailable &mdash; adapter offline</div>'; return; }
  if (!data.ok) { viewCol.innerHTML = `<div class="pp-wait">${esc(data.error)}</div>`; return; }
  const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
  viewCol.innerHTML = (ext === '.md' || ext === '.markdown')
    ? `<div class="md">${mdToHtml(data.content)}</div>`
    : `<pre class="md-pre">${esc(data.content)}</pre>`;
}

// ---- tiny markdown renderer (headings, fences, lists, quotes, hr, inline) ----
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function mdToHtml(src) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false, list = null, para = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const ln of lines) {
    if (/^```/.test(ln)) {
      flushPara(); flushList();
      out.push(inCode ? '</code></pre>' : '<pre class="md-code"><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) { out.push(esc(ln) + '\n'); continue; }
    const h = ln.match(/^(#{1,5})\s+(.*)/);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(ln)) { flushPara(); flushList(); out.push('<hr>'); continue; }
    const ul = ln.match(/^\s*[-*+]\s+(.*)/);
    const ol = ln.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { flushList(); out.push(`<${want}>`); list = want; }
      out.push('<li>' + inline((ul ?? ol)[1]) + '</li>');
      continue;
    }
    const q = ln.match(/^>\s?(.*)/);
    if (q) { flushPara(); flushList(); out.push('<blockquote>' + inline(q[1]) + '</blockquote>'); continue; }
    if (!ln.trim()) { flushPara(); flushList(); continue; }
    para.push(ln.trim());
  }
  if (inCode) out.push('</code></pre>');
  flushPara(); flushList();
  return out.join('\n');
}
