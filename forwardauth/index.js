#!/usr/bin/env node
'use strict';
/*
 * ForwardAuth — single auth decision point for the 110lymph platform.
 * Spec: handoff/auth-multi-tenancy-spec.md (Review v3 — locked Phase 0 decisions).
 *
 * Traefik forwardAuth calls /verify on EVERY request. We decide:
 *   1. X-API-Key present  -> sha256 lookup in the agent key map -> 200 + identity (agent path)
 *   2. Dex session cookie -> verify JWT against <issuer>/keys (jose) -> 200 + identity (human path)
 *   3. neither:
 *        - ENFORCE=false (Phase 0, permissive) -> 200 anonymous  [does NOT break the open SPA]
 *        - ENFORCE=true  (Phase 2)             -> 401 (API) / 302 -> Dex login (browser)
 *   - An INVALID X-API-Key is always rejected (401), even in permissive mode.
 *
 * Anti-spoof: we ALWAYS set every X-Auth-* header on a 200 (even to "" / "anonymous"),
 * so a client-supplied X-Auth-* can never survive. Pair with an edge `headers`
 * middleware that strips inbound X-Auth-* before forwardAuth for belt-and-suspenders.
 */

const http = require('http');
const crypto = require('crypto');
const { jwtVerify, createRemoteJWKSet } = require('jose');

const ENV = (k, d) => process.env[k] ?? d;
const PORT = parseInt(ENV('PORT', '8080'), 10);
const ORG_DEFAULT = ENV('ORG_DEFAULT', '110lymph');
const ENFORCE = String(ENV('ENFORCE', 'false')).toLowerCase() === 'true';   // Phase 0 = false
const DEX_ISSUER = ENV('DEX_ISSUER', 'https://olympus.110lymph.nl/dex');
const DEX_JWKS_URL = ENV('DEX_JWKS_URL', `${DEX_ISSUER}/keys`);
const DEX_LOGIN_URL = ENV('DEX_LOGIN_URL', `${DEX_ISSUER}/auth`);            // Phase 1 wires the full OIDC flow
const SESSION_COOKIE = ENV('SESSION_COOKIE', 'dex_session');                // cookie holding the Dex id_token

const log = (...a) => console.log(new Date().toISOString(), '[forwardauth]', ...a);
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const hv = (v) => String(v ?? '').replace(/[\r\n]/g, '');                   // header-value sanitizer (no CRLF injection)

// ── agent API keys: sha256(key) -> { agent, org, role } ─────────────────────
// Sources (either/both):
//   AGENT_KEY_HASHES  JSON { "<sha256hex>": "<agent-id>" | {id,org,role} }   (preferred — no raw keys at rest)
//   AGENT_KEYS        JSON { "<agent-id>": "<raw-key>" }                     (hashed at startup; convenience)
function loadKeyMap() {
  const map = new Map();
  const add = (hash, info) =>
    map.set(String(hash).toLowerCase(),
      typeof info === 'string'
        ? { agent: info, org: ORG_DEFAULT, role: 'agent' }
        : { agent: info.id, org: info.org || ORG_DEFAULT, role: info.role || 'agent' });
  try { for (const [h, i] of Object.entries(JSON.parse(ENV('AGENT_KEY_HASHES', '{}')))) add(h, i); }
  catch (e) { log('AGENT_KEY_HASHES parse error:', e.message); }
  try { for (const [agent, key] of Object.entries(JSON.parse(ENV('AGENT_KEYS', '{}')))) add(sha256(key), agent); }
  catch (e) { log('AGENT_KEYS parse error:', e.message); }
  return map;
}
const KEY_MAP = loadKeyMap();

/** Constant-time lookup: hash the presented key, compare against every stored hash. */
function lookupKey(key) {
  if (!key) return null;
  const presented = Buffer.from(sha256(key), 'hex');
  let hit = null;
  for (const [hash, info] of KEY_MAP) {
    const stored = Buffer.from(hash, 'hex');
    if (stored.length === presented.length && crypto.timingSafeEqual(stored, presented)) hit = info;
  }
  return hit;
}

// ── Dex human session ───────────────────────────────────────────────────────
const JWKS = createRemoteJWKSet(new URL(DEX_JWKS_URL));   // lazy: fetches on first verify, then cached

function cookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
function orgFromClaims(p) {
  const g = (Array.isArray(p.groups) ? p.groups : []).find((x) => String(x).startsWith('org:'));
  return g ? g.slice(4) : (p.org || null);
}
async function verifyDexSession(cookieHeader) {
  const token = cookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: DEX_ISSUER });
    return { user: payload.email || payload.sub, org: orgFromClaims(payload) || ORG_DEFAULT, role: payload.role || 'customer' };
  } catch (e) { log('dex jwt verify failed:', e.message); return null; }
}

// ── responses (always set ALL identity headers on 200) ──────────────────────
function allow(res, { user, org, method, role }) {
  res.writeHead(200, {
    'X-Auth-User': hv(user), 'X-Auth-Org': hv(org),
    'X-Auth-Method': hv(method), 'X-Auth-Role': hv(role),
  });
  res.end();
}
function deny(req, res) {
  const wantsHtml = String(req.headers['accept'] || '').includes('text/html');
  if (wantsHtml) { res.writeHead(302, { Location: DEX_LOGIN_URL }); return res.end(); }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'unauthorized' }));
}

// ── server ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://x').pathname;
    if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    if (p !== '/verify') { res.writeHead(404); return res.end(); }

    // 1. agent API key
    const key = req.headers['x-api-key'];
    if (key) {
      const info = lookupKey(key);
      if (!info) return deny(req, res);   // present but invalid -> reject even when permissive
      return allow(res, { user: info.agent, org: info.org, method: 'api-key', role: info.role });
    }

    // 2. human Dex session
    const human = await verifyDexSession(req.headers['cookie']);
    if (human) return allow(res, { user: human.user, org: human.org, method: 'dex', role: human.role });

    // 3. neither
    if (!ENFORCE) return allow(res, { user: 'anonymous', org: ORG_DEFAULT, method: 'none', role: 'anonymous' });
    return deny(req, res);
  } catch (e) {
    log('verify error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal' }));
  }
});

server.listen(PORT, () => log(`listening on :${PORT} | enforce=${ENFORCE} | ${KEY_MAP.size} agent key(s) | issuer=${DEX_ISSUER}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
