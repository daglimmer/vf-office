# Fix Let's Encrypt Certificates — Traefik on K3s

**Written:** 2026-07-07  
**For:** Opus  
**Priority:** P0 — all HTTPS services returning self-signed/temporary certs

---

## What was set up

| Component | Detail |
|---|---|
| **Ingress controller** | Traefik v3.6.12 (Helm chart `traefik-39.0.701+up39.0.7`) in `kube-system` |
| **Certificate provider** | Let's Encrypt (production) |
| **Challenge type** | DNS-01 via Cloudflare |
| **DNS provider** | Cloudflare (NS: `ximena.ns.cloudflare.com`, `glen.ns.cloudflare.com`) |
| **Zone** | `110lymph.nl` (Zone ID: `e625b5bea12c0525fdfd9d385a02d545`) |
| **Domains covered** | All `*.110lymph.nl` services via IngressRoute `tls.certResolver: letsencrypt` |
| **ACME storage** | `/data/acme.json` inside Traefik pod _(EmptyDir — ephemeral!)_ |
| **Cloudflare API token** | K8s secret `cloudflare-api-token` in `kube-system`, key `CLOUDFLARE_DNS_API_TOKEN` |

### How it worked

1. IngressRoute declares `tls.certResolver: letsencrypt`
2. Traefik's built-in ACME client checks if a valid cert exists in `/data/acme.json`
3. If not → Traefik calls Let's Encrypt → gets DNS-01 challenge → creates TXT record via Cloudflare API → LE verifies → cert issued → stored in `acme.json`
4. Certs auto-renew 30 days before expiry

---

## What broke

**Root cause:** The `certificatesResolvers.letsencrypt` configuration was **removed from Traefik's config** during the Helm upgrade on **July 6, 2026 at 18:04 UTC** (revision 11).

**Symptoms:**
```
ERR Router uses a nonexistent certificate resolver certificateResolver=letsencrypt
```
- Every IngressRoute references `certResolver: letsencrypt` but the resolver doesn't exist
- Traefik API confirms: `certificatesResolvers: {}` (empty)
- `/data` directory in pod is empty — EmptyDir wiped on pod restart
- All previously valid Let's Encrypt certs are **gone**
- Browsers see self-signed/temporary Traefik default cert

### Current Helm values (missing certResolver)

`helm get values traefik -n kube-system` shows NO certificatesResolvers config.

The certResolver was likely configured via Helm values or additional CLI arguments that were dropped in revision 11.

---

## Fix

### Step 1: Add certResolver back to Traefik

The standard Traefik Helm values for Let's Encrypt DNS-01 with Cloudflare:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: YOUR_EMAIL_HERE       # ← NEEDS CONFIRMATION (Ray suggested glimmerman11@hotmail.com)
      storage: /data/acme.json
      caServer: "https://acme-v02.api.letsencrypt.org/directory"
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "1.0.0.1:53"
```

The Cloudflare provider is auto-detected from env var `CLOUDFLARE_DNS_API_TOKEN` (already set).

**Important:** Do NOT use the staging CA — we need production certs.

### Step 2: Fix the EmptyDir problem

`/data` is currently an `EmptyDir` — certs are lost on every pod restart. This means:
- Every restart triggers a NEW Let's Encrypt order
- Rate limits: 50 certs per domain per week — **we WILL hit this with frequent restarts**

Fix by mounting `/data` from a persistent source. TWO options:

**Option A: hostPath (simpler, immediate)**
```yaml
persistence:
  enabled: true
  name: data
  accessMode: ReadWriteOnce
  size: 128Mi
  path: /data
  storageClass: ""
  # Or manually via additionalVolumes
```

**Option B: PVC (proper, recommended)**
```yaml
persistence:
  enabled: true
  name: data
  accessMode: ReadWriteOnce
  size: 128Mi
  storageClass: local-path
```

The `local-path` provisioner is available (K3s default). 128Mi is more than enough for acme.json + certs.

### Step 3: Apply

```bash
helm upgrade traefik traefik/traefik \
  -n kube-system \
  --values traefik-values.yaml \
  --reuse-values
```

Or if using `--set`:
```bash
helm upgrade traefik traefik/traefik \
  -n kube-system \
  --reuse-values \
  --set persistence.enabled=true \
  --set persistence.size=128Mi \
  --set certificatesResolvers.letsencrypt.acme.email=YOUR_EMAIL \
  --set certificatesResolvers.letsencrypt.acme.storage=/data/acme.json \
  --set certificatesResolvers.letsencrypt.acme.dnsChallenge.provider=cloudflare
```

### Step 4: Verify

Wait 30-60 seconds after deployment, then:

```bash
# 1. Check certResolver is registered
kubectl exec -n kube-system deployment/traefik -- wget -qO- http://localhost:8080/api/rawdata | jq '.certificatesResolvers'

# Should show:
# {
#   "letsencrypt": {
#     "acme": {
#       "email": "...",
#       ...
#     }
#   }
# }

# 2. Check Traefik logs for ACME activity
kubectl logs -n kube-system deployment/traefik --tail=50 | grep -i acme

# 3. Wait for cert issuance, then verify
curl -svI https://olympus.110lymph.nl 2>&1 | grep -E 'SSL|subject|issuer|expire'

# Should show issuer: "C = US, O = Let's Encrypt, CN = R11"
```

---

## Unresolved

**The Let's Encrypt registration email needs confirmation.** The certResolver config was lost so we can't extract it from the cluster. Ray suggested `glimmerman11@hotmail.com` as the email — verify with him or check the Cloudflare dashboard / Let's Encrypt notification history.

If a new email is used, a new Let's Encrypt account will be created. Rate limits apply per-account AND per-domain.

---

## Existing state (reference)

| Item | Status |
|---|---|
| Cloudflare API token | ✅ Active, full zone access to `110lymph.nl` |
| Traefik pod | ✅ Running, v3.6.12 |
| certResolver config | ❌ Empty (`certificatesResolvers: {}`) |
| `/data` directory | ❌ Empty (EmptyDir, wiped) |
| DNS A record | ✅ `olympus.110lymph.nl` → `10.75.1.211` |
| IngressRoutes | ✅ All have `tls.certResolver: letsencrypt` |
| Helm revision | v11 (2026-07-06 18:04 UTC) — certResolver LOST in this revision |

---

## Command reference

```bash
# See current Helm values
helm get values traefik -n kube-system

# See Traefik certResolver state
kubectl exec -n kube-system deployment/traefik -- wget -qO- http://localhost:8080/api/rawdata | python3 -m json.tool | grep -A20 certificatesResolvers

# Check Cloudflare token
kubectl get secret cloudflare-api-token -n kube-system -o jsonpath='{.data.CLOUDFLARE_DNS_API_TOKEN}' | base64 -d

# Force certificate renewal
kubectl exec -n kube-system deployment/traefik -- rm /data/acme.json
kubectl rollout restart deployment/traefik -n kube-system
```
