# Opus Handoff — Argus Auth Login Broken (FORCE RLS on customer_users)

**Date:** 2026-06-18
**Target:** argus.110lymph.nl (staging)
**Discovered while running isolation proof** — DB-level RLS tests passed, but API isolation test blocked by inability to log in.

---

## Root Cause

The `customer_users` table has `FORCE ROW LEVEL SECURITY` enabled, but the `loginIdentity()` function used by **both** dev login and OIDC login queries this table through the regular connection pool (`DATABASE_URL` → `argus_app` role) — without setting `app.current_tenant`.

Since `argus_app` has `NOBYPASSRLS`, the RLS policy applies: `customer_id = current_setting('app.current_tenant', true)::uuid`. When `app.current_tenant` isn't set, `current_setting` returns `NULL`, and `customer_id = NULL::uuid` matches nothing.

**SQL proof:**

```sql
-- As owner role — sees the user
argus=# SELECT * FROM customer_users WHERE lower(email) = lower('demo@acme.example');
  id | customer_id | ... | email
─────┼─────────────┼─────┼────────────────────────────────
 ... | ...         | ... | demo@acme.example
(1 row)

-- As app role — RLS blocks, sees nothing
argus=# SET ROLE argus_app;
argus=> SELECT * FROM customer_users WHERE lower(email) = lower('demo@acme.example');
 email
───────
(0 rows)
```

**Impact:**
- ❌ Dev login at `POST /api/auth/dev` — returns **403** every time
- ❌ OIDC login via Dex — would also return **403** (same `loginIdentity()` function)
- ❌ API isolation test (`api-isolation.sh`) — blocked at step 1: can't get session cookie

---

## Fix Options (pick one)

### Recommendation: Option 1

| # | Option | Effort | Why |
|---|--------|--------|-----|
| 1 | **Remove RLS from `customer_users`** — it's an auth lookup table, not tenant data | Low | Simplest. Auth by email is global; tenant membership is just a column, not an RLS concern |
| 2 | **Add a separate admin pool** using the `argus` (owner) role for auth queries | Medium | Bypasses RLS entirely for auth — clean separation, but needs code + config changes |
| 3 | **Set `app.current_tenant` before auth lookups** | Hard | Chicken-and-egg: you need the user to know their tenant, but you're looking up the user to find their tenant |

---

## Verification After Fix

```bash
curl -s -X POST https://argus.110lymph.nl/api/auth/dev \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@acme.example"}'
```

Should return a session cookie + redirect (200/302, not 403).

Then the API isolation test can run:

```bash
cd /root/repos/Projects/argus-portal/verify
bash api-isolation.sh
```

---

## Relevant Files

- `argus-portal/src/lib/db.ts` — pool setup (`DATABASE_URL` = `argus_app` role)
- `argus-portal/src/lib/auth.ts` (or equivalent) — `loginIdentity()` function
- `argus-portal/migrations/00002_rls.sql` — RLS policy on `customer_users` with FORCE

---

## Context from DB-Level Isolation Proof

The RLS on *data* tables (`findings`, `finding_events`) works correctly:

| Test | Result | Detail |
|------|--------|--------|
| argus_app cannot bypass RLS | ✅ PASS | `NOBYPASSRLS` enforced |
| Tenant A sees only own rows | ✅ PASS | Counts match per tenant |
| Cross-tenant read by ID | ✅ PASS | Returns empty set |
| Cross-tenant INSERT blocked | ✅ PASS | Policy violation error |
| No tenant context = 0 rows | ✅ PASS | Fail-closed |

The *auth lookup* table just shouldn't have RLS — it's the gatekeeper that determines *which* tenant you belong to.
