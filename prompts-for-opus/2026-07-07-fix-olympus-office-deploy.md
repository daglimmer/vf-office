# Olympus Office — Deployment Fix (July 7, 2026)

## Current State (CRITICAL — broken)
- **Deployment**: `olympus-office-84f4c7d56b` — CrashLoopBackOff, 12m old
- **Status**: ProgressDeadlineExceeded
- **Service**: `olympus-office:80 → targetPort:7101` (WRONG — nothing on 7101)
- **Ingress**: Traefik IngressRoute `olympus-https` routes `/office`, websockets, static assets → `olympus-office:80`
- **Root cause**: Pod crashes immediately — SQLite can't open `/root/.hermes/kanban.db`

## Two Bugs — Fix Both

### Bug 1: Port Mismatch
Service sends traffic to port **7101**, but container listens on **3000**.
```
# Fix:
kubectl patch svc olympus-office -n mission-control -p \
  '{"spec":{"ports":[{"name":"http","port":80,"targetPort":3000}]}}'
```

### Bug 2: No Database Volume Mount
The adapter (`/root/repos/vf-office/adapter/index.js`) opens `HERMES_DB` (default: `/root/.hermes/kanban.db`) read-only. The deployment has **zero volumes**. The container has no kanban.db, so it crashes.

**Fix**: Mount `kanban.db` into the pod. Options:
- **Option A (fastest)**: HostPath + nodeSelector to the node that can reach Hermes VM's filesystem
- **Option B (better)**: Run adapter directly on Hermes VM as systemd service → point ExternalName service at it

## Working Deployment Manifest (corrected)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: olympus-office
  namespace: mission-control
  labels:
    app: olympus-office
spec:
  replicas: 1
  selector:
    matchLabels:
      app: olympus-office
  template:
    metadata:
      labels:
        app: olympus-office
    spec:
      containers:
      - name: olympus-office
        image: 10.75.1.211:30500/vf-office:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: HERMES_DB
          value: /data/kanban.db
        volumeMounts:
        - name: kanban-db
          mountPath: /data/kanban.db
          subPath: kanban.db
          readOnly: true
        livenessProbe:
          httpGet:
            path: /office/
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 20
        readinessProbe:
          httpGet:
            path: /office/
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: kanban-db
        hostPath:
          path: /root/.hermes/kanban.db
          type: File
```

**IMPORTANT**: The `hostPath` above assumes the pod lands on the node where `/root/.hermes/kanban.db` exists. You may need a `nodeSelector` or run the pod specifically on the Hermes VM node.

## Full Source Tree (for reference)
```
/root/repos/vf-office/
├── adapter/
│   ├── index.js        # Adapter — serves /office/, WS, REST, reads kanban.db
│   ├── config/
│   │   ├── agents.json
│   │   ├── mapping.json
│   │   └── topology.json
│   └── sources/
├── public/             # 3D office frontend (built by Vite)
│   ├── 3d.html
│   ├── anchors.json
│   └── waypoints.json
├── Dockerfile          # Two-stage: Vite build → Node adapter, all on port 3000
├── package.json
└── prompts-for-opus/   # Previous handoff notes
```

## Dockerfile (Combined — Frontend + Adapter)
```
FROM node:22-alpine AS builder
# Builds Vite frontend to /app/dist

FROM node:22-alpine
# Copies adapter + built frontend
EXPOSE 3000
CMD ["node", "index.js"]
```

## Routing Architecture
```
olympus.110lymph.nl (Traefik IngressRoute: olympus-https)
├── /office*      → olympus-office-strip middleware → olympus-office:80 (→ needs port 3000!)
├── /ws           → olympus-office:80               (WebSocket for live board updates)
├── /api/kanban   → kanban-bridge:7100               (REST — Hermes VM kanban)
├── /api/agents   → vf-dashboard:8090
├── /api/cost     → cost-cache-proxy:80
├── /docs         → fumadocs:3000
└── /             → vf-dashboard:80
```

## Staging Deployment (KNOWN WORKING — reference)
- `olympus-office-staging` — 1/1 Ready, port 80→3000
- Check it: `kubectl describe deploy olympus-office-staging -n mission-control`

## Verify Fix
```bash
# After Service fix + volume mount:
kubectl get pods -n mission-control -l app=olympus-office -w
curl -sk https://olympus.110lymph.nl/office/ | head -20
curl -sk https://olympus.110lymph.nl/ws -H "Upgrade: websocket" -H "Connection: Upgrade"
```
