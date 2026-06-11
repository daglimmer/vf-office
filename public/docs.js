// Phase 7 - Docs Portal: 380px frosted-glass drawer sliding in from the right.
// Tree view of agent docs (skills/, souls/, memory/, docs/) from the bridge
// adapter (/api/docs/tree, /api/docs/file). Clicking a file renders markdown
// inline (built-in lightweight renderer, no deps); a back button returns to
// the tree. States: skeleton shimmer while loading, "Docs unavailable -
// adapter offline" on fetch failure, "No files in this folder" when empty.

let root = null, body = null, backBtn = null, srcEl = null;
let onCloseCb = null, treeEl = null;

export function initDocs(opts = {}) {
  onCloseCb = opts.onClose ?? null;
  root = document.createElement('div');
  root.id = 'docs-panel';
  root.className = 'side-panel';
  root.innerHTML = `
    <div class="sp-head">
      <button class="sp-back" style="display:none">&larr; back</button>
      <b>&#128196; Docs</b><span class="sp-src"></span>
      <button class="pp-close" title="close">&#10005;</button>
    </div>
    <div class="sp-body"></div>`;
  document.body.appendChild(root);
  body = root.querySelector('.sp-body');
  srcEl = root.querySelector('.sp-src');
  backBtn = root.querySelector('.sp-back');
  backBtn.onclick = showTree;
  root.querySelector('.pp-close').onclick = () => { toggleDocs(false); if (onCloseCb) onCloseCb(); };
  return { toggle: toggleDocs };
}

export function toggleDocs(on) {
  if (!root) return;
  root.classList.toggle('open', !!on);
  if (on && !treeEl) loadTree();
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const skeleton = n => '<div class="skel-wrap">' +
  Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${88 - (i * 13) % 40}%"></div>`).join('') + '</div>';

async function loadTree() {
  body.innerHTML = skeleton(8);
  let data;
  try { data = await fetch('/api/docs/tree').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch {
    body.innerHTML = '<div class="pp-wait">Docs unavailable &mdash; adapter offline</div>';
    return;
  }
  const any = data.roots?.some(r => r.available && r.entries.length);
  if (!any && data.docsUrl) {                       // optional Fumadocs iframe fallback
    body.innerHTML = `<iframe class="docs-frame" src="${esc(data.docsUrl)}" title="docs"></iframe>`;
    srcEl.textContent = data.docsUrl;
    treeEl = body.firstElementChild;
    return;
  }
  treeEl = document.createElement('div');
  treeEl.className = 'docs-tree-v2';
  treeEl.innerHTML = (data.roots ?? []).map(r => `
    <div class="dt-root">${esc(r.name)}/</div>
    ${r.available && r.entries.length ? renderEntries(r.entries, 0)
      : `<div class="dt-empty">${r.available ? 'No files in this folder' : 'unavailable'}</div>`}`).join('');
  for (const el of treeEl.querySelectorAll('.dt-item[data-path]'))
    el.onclick = () => openFile(el.dataset.path);
  for (const el of treeEl.querySelectorAll('.dt-item.dt-dir'))
    el.onclick = () => el.parentElement.classList.toggle('dt-open');
  showTree();
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

function showTree() {
  backBtn.style.display = 'none';
  srcEl.textContent = '';
  if (treeEl) { body.innerHTML = ''; body.appendChild(treeEl); }
}

async function openFile(p) {
  backBtn.style.display = '';
  srcEl.textContent = p;
  body.innerHTML = skeleton(10);
  let data;
  try { data = await fetch('/api/docs/file?path=' + encodeURIComponent(p)).then(r => r.json()); }
  catch { body.innerHTML = '<div class="pp-wait">Docs unavailable &mdash; adapter offline</div>'; return; }
  if (!data.ok) { body.innerHTML = `<div class="pp-wait">${esc(data.error)}</div>`; return; }
  const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
  body.innerHTML = (ext === '.md' || ext === '.markdown')
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
