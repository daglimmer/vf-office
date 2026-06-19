# ForwardAuth

Single auth decision point for the 110lymph platform (Traefik `forwardAuth`).
Spec: `Projects/handoff/auth-multi-tenancy-spec.md` (Review v3 — locked Phase 0).

## What it does
Traefik calls `GET /verify` on every request to a protected route. Returns:

| Input | Result |
|---|---|
| valid `X-API-Key` (agent) | `200` + identity headers (`method=api-key`) |
| valid Dex session cookie (human) | `200` + identity headers (`method=dex`) |
| invalid `X-API-Key` | `401` (always rejected) |
| neither, `ENFORCE=false` (Phase 0) | `200` anonymous — **does not break the open SPA** |
| neither, `ENFORCE=true` (Phase 2) | `401` (API) / `302 → Dex` (browser) |

On every `200` it sets **all** of `X-Auth-User`, `X-Auth-Org`, `X-Auth-Method`,
`X-Auth-Role` (never trusts inbound values — pair with `strip-auth-headers`).

## Env
| Var | Default | Notes |
|---|---|---|
| `PORT` | `8080` | |
| `ENFORCE` | `false` | Phase 0 permissive; `true` at Phase 2 |
| `ORG_DEFAULT` | `110lymph` | org for agents / when no claim |
| `DEX_ISSUER` | `https://olympus.110lymph.nl/dex` | |
| `DEX_JWKS_URL` | `<issuer>/keys` | JWKS for JWT verify |
| `SESSION_COOKIE` | `dex_session` | cookie holding the Dex id_token (set by the login flow in Phase 1) |
| `AGENT_KEY_HASHES` | `{}` | JSON `{ "<sha256hex>": "<agent-id>" \| {id,org,role} }` (preferred) |
| `AGENT_KEYS` | `{}` | JSON `{ "<agent-id>": "<raw-key>" }` (hashed at startup; convenience) |

Agents send **only** `X-API-Key` (the key self-identifies the agent via the hash map).

## Build & deploy
```bash
docker build -t 10.75.1.211:30500/forwardauth:latest forwardauth/
docker push 10.75.1.211:30500/forwardauth:latest
kubectl apply -f forwardauth/k8s.yaml      # fill the real key hashes in the Secret first
```

## Wire onto a route (Phase 0 — /api/*, permissive)
Chain the two middlewares in order on the IngressRoute:
```yaml
middlewares:
  - name: strip-auth-headers   # clears inbound X-Auth-* (anti-spoof)
  - name: forwardauth          # then sets the real ones
```

## Phases
- **Phase 0:** deploy with `ENFORCE=false`, attach to `/api/*`. Agents with keys get
  identity; keyless calls still pass (SPA unaffected). Verify heartbeats/usage/CVE→Kanban
  keep working.
- **Phase 1:** attach to dashboard frontend routes; wire the Dex login flow that sets the
  `dex_session` cookie. (Dashboard reads `X-Auth-Org`/`X-Auth-User` to scope its view.)
- **Phase 2:** flip `ENFORCE=true` on `/api/*` — now requires key OR Dex session.
