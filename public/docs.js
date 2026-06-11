// Phase 6 - Docs portal panel (HUD tab). File-tree browser for agent skills/,
// souls/, memory/ and docs/ served by the bridge adapter (/api/docs/*), with a
// small built-in markdown renderer (no external deps). If no doc roots are
// available but a docsUrl is configured (mapping.json), falls back to an iframe.

let root = null, onCloseCb = null, loaded = false, current = null;

export function initDocs(opts = {}) {
  onCloseCb = opts.onClose ?? null;
  root = document.createElement('div');
  root.id = 'docs-panel';
  root.className = 'page-panel';
  root.style.display = 'none';
  root.innerHTML = `
    <div class="pp-head"><b>Docs</b><span class="pp-src"></span><button class="pp-close" title="close">&#10005;</button></div>
    <div class="pp-body docs-wrap">
      <div class="docs-tree"><div class="pp-wait">loading&hellip;</div></div>
      <div class="docs-content"><div class="pp-wait">select a file on the left</div></div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('.pp-close').onclick = () => { toggleDocs(false); if (onCloseCb) onCloseCb(); };
  return { toggle: toggleDocs };
}

export function toggleDocs(on) {
  if (!root) return;
  root.style.display = on ? 'flex' : 'none';
  if (on && !loaded) loadTree();
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function loadTree() {
  const treeEl = root.querySelector('.docs-tree');
  let data;
  try { data = await fetch('/api/docs/tree').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { treeEl.innerHTML = '<div class="pp-wait">adapter unreachable &mdash; waiting&hellip;</div>'; return; }
  loaded = true;
  const any = data.roots?.some(r => r.available && r.entries.length);
  if (!any) {
    if (data.docsUrl) {                                    // iframe fallback (Fumadocs site)
      root.querySelector('.docs-wrap').innerHTML =
        `<iframe class="docs-frame" src="${esc(data.docsUrl)}" title="docs"></iframe>`;
      root.querySelector('.pp-src').textContent = data.docsUrl;
      return;
    }
    treeEl.innerHTML = '<div class="pp-wait">waiting for doc roots (skills/, souls/, memory/, docs/)&hellip;</div>';
    return;
  }
  treeEl.innerHTML = (data.roots ?? []).map(r => `
    <div class="dt-root">${esc(r.name)}${r.available ? '' : ' <em>(unavailable)</em>'}</div>
    ${renderEntries(r.entries, 0)}`).join('');
  for (const el of treeEl.querySelectorAll('.dt-item[data-path]')) {
    el.onclick = () => openFile(el.dataset.path, el);
  }
  for (const el of treeEl.querySelectorAll('.dt-item.dt-dir')) {
    el.onclick = () => el.parentElement.classList.toggle('dt-open');
  }
}

function renderEntries(entries, depth) {
  return (entries ?? []).map(e => e.dir
    ? `<div class="dt-folder ${depth === 0 ? 'dt-open' : ''}" style="margin-left:${depth * 10}px">
         <div class="dt-item dt-dir">&#9656; ${esc(e.name)}/</div>
         <div class="dt-children">${renderEntries(e.children, depth + 1)}</div></div>`
    : `<div class="dt-item" data-path="${esc(e.path)}" style="margin-left:${depth * 10}px">${esc(e.name)}</div>`
  ).join('');
}

async function openFile(p, el) {
  const content = root.querySelector('.docs-content');
  for (const x of root.querySelectorAll('.dt-item.on')) x.classList.remove('on');
  el.classList.add('on');
  current = p;
  content.innerHTML = '<div class="pp-wait">loading&hellip;</div>';
  let data;
  try { data = await fetch('/api/docs/file?path=' + encodeURIComponent(p)).then(r => r.json()); }
  catch { content.innerHTML = '<div class="pp-wait">adapter unreachable</div>'; return; }
  if (!data.ok) { content.innerHTML = `<div class="pp-wait">${esc(data.error)}</div>`; return; }
  root.querySelector('.pp-src').textContent = p;
  const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
  content.innerHTML = (ext === '.md' || ext === '.markdown')
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
