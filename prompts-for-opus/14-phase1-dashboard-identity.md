# Phase 1: Dashboard Identity Awareness
## For: Opus | From: Marcus | 2026-06-19

## Background — What Changed

Phase 0 is deployed. A ForwardAuth gatekeeper sits in front of `/api/*` at olympus.110lymph.nl. It's in permissive mode (no key required, still works like before). But it already:

1. Validates API keys → sets X-Auth-User, X-Auth-Org, X-Auth-Method headers
2. Validates Dex session cookies → sets same headers
3. Passes unauthenticated requests as "anonymous"

The dashboard server (vf-dashboard/server/routes.ts) currently ignores these headers. Phase 1 makes it aware of them.

## What To Build

### Server-side (routes.ts)
The dashboard server already receives X-Auth-User, X-Auth-Org, X-Auth-Method headers from ForwardAuth on every request. It just ignores them.

**Add:**
1. **`/api/whoami` endpoint** — reads headers, returns `{user, org, method}`
2. **Identity middleware** — extracts headers once, makes them available to all routes (req.identity or similar)
3. **Pass identity in responses** where relevant (e.g., `/api/agents` could include `requestedBy`)

### Frontend (App.tsx + Nav.tsx)
1. **Nav bar identity display**: call `/api/whoami` on mount, show:
   - If logged in: "👤 {user} ({org})" with logout option
   - If anonymous: "Login with Dex" linking to Dex
2. **Login flow**: 
   - Link to: `https://olympus.110lymph.nl/dex/auth?response_type=id_token&client_id=dashboard&redirect_uri=https://olympus.110lymph.nl&scope=openid+profile+email+groups&nonce=RANDOM`
   - After Dex redirects back, extract id_token from URL fragment, set `dex_session` cookie on `.110lymph.nl`
   - Reload page → ForwardAuth picks up cookie → dashboard sees identity
3. **Logout**: clear `dex_session` cookie, redirect to `https://olympus.110lymph.nl/dex/logout`

### Dex Config
Add to the `outline/dex-config` ConfigMap:
```yaml
staticClients:
  - id: dashboard
    name: Dashboard
    redirectURIs:
      - https://olympus.110lymph.nl
```
This is implicit flow — no client secret needed. The id_token comes back in the URL fragment, JS extracts it.

## Context — Key Files
- Dashboard server: `vf-dashboard/server/routes.ts`
- Dashboard frontend: `vf-dashboard/src/App.tsx`, `vf-dashboard/src/components/Nav.tsx`
- ForwardAuth service: `forwardauth/index.js` (DO NOT MODIFY — already deployed)
- Dex ConfigMap: `outline/dex-config` in the cluster
- Spec file: `daglimmer/Projects/handoff/auth-multi-tenancy-spec.md` (Phase 1 section)

## Constraints
- DO NOT modify ForwardAuth — it's deployed and working
- DO NOT add per-route enforcement — still permissive mode
- DO NOT add Dex connectors (GitHub/Google) — Phase 2
- DO NOT touch Fumadocs — Phase 3
- All deploys via GitHub Actions CI/CD (docker build → push → kubectl apply)
- Dashboard runs at olympus.110lymph.nl, namespace: mission-control

## Verification
After implementing:
1. `curl https://olympus.110lymph.nl/api/whoami` → returns `{user: "anonymous", org: "", method: "anonymous"}`
2. Login via Dex → cookie set → `/api/whoami` returns real identity
3. Agent API calls with X-API-Key still work unchanged
4. Dashboard pages still render correctly for anonymous users
