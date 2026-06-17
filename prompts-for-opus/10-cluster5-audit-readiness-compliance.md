# 110lymph Autonomous Operations Framework — Cluster 5
## Audit Readiness → Security Compliance → Evidence Chain

> **Version:** v6 · **Status:** Architecture Draft · **Scope:** Cluster 5 of 5
>
> *This document defines the security, compliance, and audit-readiness layer that sits above the entire autonomous operations stack. Everything we've built — monitoring, knowledge, governance, predictive capacity — is meaningless if we cannot prove it works to an external auditor. Cluster 5 solves that: it turns operational capability into demonstrable evidence, maps every action to compliance frameworks, and produces the artefacts an auditor expects to see.*
>
> *Designed for three audiences: (1) ourselves — so we know we're covered; (2) customers — so they can see what standard we hold ourselves to; (3) auditors — so they can verify without digging through infrastructure.*

---

## 1. Executive Summary

Cluster 5 solves a fundamental problem: **operational automation is invisible without an evidence trail.** An agent remediates a P1 incident in 90 seconds. A policy engine blocks a destructive action. A playbook executes perfectly. But if you're an external auditor — or a prospective customer evaluating our platform — *did any of that actually happen?*

The answer is **Cluster 5: the compliance shell.** It wraps every capability we've built in a provable, auditable, standards-mapped layer:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WHAT THE AUDITOR SEES                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Compliance Portal (one URL, everything they need)            │    │
│  │                                                              │    │
│  │  - Standards alignment matrix (ISO 27001, SOC 2, NIST)      │    │
│  │  - Evidence package generator (one-click export)             │    │
│  │  - Policy definitions (what we allow, what we block)         │    │
│  │  - Audit log (immutable, searchable, filterable)             │    │
│  │  - Incident history (every P1, every response, every SLA)    │    │
│  │  - Change history (every deployment, who/what/when/why)      │    │
│  │  - Third-party attestations (pen test, SBOM, dependency scan)│    │
│  │  - Data flow diagram (where data lives, how it moves)        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Design principles:**
- **Evidence-first, not checkbox** — every policy, every control, every process is backed by live data, not a document that says "we do X."
- **Audit-ready by default** — the compliance portal is not a separate project. It's generated from the data the system already produces.
- **Standards-agnostic** — the evidence layer is framework-agnostic. Map the same data to ISO 27001, SOC 2, NIST 800-53, or maritime-specific standards (IMO FAL, ISM Code) without rebuilding.
- **Automated evidence collection** — no manual "gather the logs." The system produces compliance artefacts as a side effect of normal operation.
- **Transparent, not hidden** — customers can see our compliance posture. No black boxes.
- **Proportional controls** — a 5-person startup doesn't need SOC 2 Type II. But they need to know what they *would* need when the customer asks.

---

## 2. Architecture Overview

### 2.1 The Compliance Pyramid

```
                          ▲
                         ╱ ╲
                        ╱   ╲
                       ╱  A  ╲     A — Standards Alignment
                      ╱ AUDIT  ╲        (which frameworks map here?)
                     ╱   PROOF  ╲
                    ╱_____________╲
                   ╱               ╲
                  ╱  B  EVIDENCE   ╲   B — Evidence Collection
                 ╱      CHAIN       ╲      (does the data exist to prove it?)
                ╱___________________╲
               ╱                     ╲
              ╱   C  POLICY &         ╲  C — Policy & Control Layer
             ╱      CONTROL LAYER      ╲     (what do we say we do?)
            ╱___________________________╲
           ╱                             ╲
          ╱   D  OPERATIONAL             ╲  D — Operational Foundation
         ╱      FOUNDATION                ╲     (Clusters 1-4 — the thing we prove)
        ╱___________________________________╲
```

| Layer | What It Means | Who Cares |
|-------|---------------|-----------|
| **D: Operational Foundation** | Clusters 1-4 — monitoring, remediation, knowledge, governance, capacity. The thing we're proving works. | Us |
| **C: Policy & Control Layer** | What we say we do: "we require human approval for production deletes," "we patch critical CVEs within 24h," "we log every action." Written policies that auditors review. | Auditors, Customers |
| **B: Evidence Chain** | The data that proves layer C is real: immutable audit logs, deployment receipts, incident timelines, policy-governance records. Every policy has a corresponding evidence source. | Auditors |
| **A: Standards Alignment** | Which frameworks map to which controls. ISO 27001 Annex A, SOC 2 trust criteria, NIST 800-53 controls, IMO FAL, ISM Code — mapped to our policies and evidence. | Auditors, Customers, Insurers |

### 2.2 Component Mapping

| Component | What It Is | Status | Who Builds |
|-----------|-----------|--------|------------|
| **Standards Matrix** | Framework → control → policy mapping table | ❌ Not built | Us |
| **Evidence Package Generator** | One-click export: "here's everything an ISO 27001 auditor needs" | ❌ Not built | Opus |
| **Compliance Dashboard** | Visual: compliance score, outstanding gaps, evidence freshness | ❌ Not built | Us |
| **SBOM Generator** | Software Bill of Materials for every deployment image | ❌ Not built | Pipeline |
| **Dependency Scanner** | CVE scan on dependencies (npm, pip, apt packages in images) | ❌ Not built | Pipeline |
| **Incident History** | Every P1/P2 with timeline, response, SLA compliance | ❌ Not built | Dashboard |
| **Change History** | Every deployment with who/what/when/why | ❌ Not built | Dashboard |
| **Data Flow Diagram** | Auto-generated: where data lives, how it moves | ❌ Not built | Opus |
| **Policy Document Generator** | Human-readable policy documents from governance config | ❌ Not built | Opus |
| **Compliance Cron Job** | Weekly check: "are all evidence sources still producing data?" | ❌ Not built | Us |

---

## 3. Standards Alignment — "Which Frameworks Apply?"

### 3.1 Framework Selection

| Framework | Applicability | Priority | Target Level |
|-----------|---------------|----------|--------------|
| **ISO/IEC 27001:2022** | Information security management | **HIGH** | Full certification path |
| **SOC 2 Type II** | Service organisation controls | **MEDIUM** | Report-ready (no formal audit) |
| **NIST SP 800-53 Rev. 5** | Security and privacy controls | **MEDIUM** | Mapping only |
| **NIST CSF 2.0** | Cybersecurity framework | **HIGH** | Full alignment |
| **IMO FAL Convention** | Maritime facilitation (customer-facing) | **MEDIUM** | Documented controls |
| **ISM Code** | International Safety Management (maritime) | **LOW** | Reference only |

> **Strategic note:** ISO 27001 is the primary target because it's the most universally recognised standard for our type of operation — an autonomous infrastructure management platform. SOC 2 is complementary for US-based customers. NIST CSF is the pragmatic framework for daily operations. Maritime standards apply when we serve shipping/logistics customers.

### 3.2 ISO 27001 Annex A Mapping (Key Controls)

Below are the Annex A controls that our autonomous operations framework directly addresses. Each is mapped to the Cluster that delivers it and the evidence that proves it.

#### A.5 — Information Security Policies

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.5.1 (Policies) | Written security policy published on compliance portal | Cluster 5 | Compliance Portal /docs/policies |
| A.5.2 (Review) | Policy reviewed quarterly by Marcus | Cluster 5 | Review log with timestamps |
| A.5.3 (Exceptions) | Policy override system with mandatory expiry | Cluster 3 | Override audit log |

#### A.6 — Organisation of Information Security

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.6.1.1 (Roles) | Agent trust tiers defined in agent-tiers.yaml | Cluster 3 | Config + agent roster |
| A.6.1.2 (Segregation) | Network policy isolation, namespace RBAC | OPNsense + K8s | Network policy manifests |
| A.6.1.5 (Third Parties) | Opus has restricted access (read + staging only) | Cluster 3 | Agent tier config |

#### A.8 — Asset Management

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.8.1.1 (Inventory) | Topology.json + fleet inventory (live config) | Opus + Dashboard | /api/inventory endpoint |
| A.8.1.2 (Ownership) | Every asset tagged with owner agent | Cluster 3 | Asset ownership list |
| A.8.7 (Media handling) | Data classification: config/log/customer/knowledge | Cluster 5 | Classification policy |

#### A.9 — Access Control

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.9.1.1 (Policy) | Access = SSH key for every agent. Policy gates actions, not credentials | Cluster 3 | Governance policy rules |
| A.9.1.2 (Network) | Network policy: prod VLAN isolated, K3s network policy | OPNsense + K8s | Firewall rules + NetworkPolicy YAML |
| A.9.2.1 (Provision) | New agent auto-provisioned with keys, added to trust tier | Cluster 3 | Agent provisioning log |
| A.9.2.5 (Review) | Agent access reviewed monthly by Oly | Cluster 3 | Review log |
| A.9.4.1 (Secrets) | API keys in Kubernetes secrets, never in config | K8s + Cluster 5 | Secret manifests (names only) |

#### A.10 — Cryptography

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.10.1.1 (Policy) | All traffic encrypted in transit (TLS everywhere) | OPNsense + Traefik | Certificate list + expiry tracking |
| A.10.1.2 (Key Mgmt) | Let's Encrypt auto-renewal + manual key rotation for critical | Cert-manager | Certificate renewal log |

#### A.11 — Physical Security (Not applicable — cloud VM on provider infra)
> Noted for customer questionnaire responses. We provide our provider's attestation.

#### A.12 — Operations Security

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.12.1.1 (Procedures) | All procedures documented as KB playbooks | Cluster 2 | Outline KB, playbook count |
| A.12.1.2 (Change Mgmt) | Cluster 3 pre-flight + deployment pipeline | Cluster 3 + CI/CD | Governance log + deployment records |
| A.12.1.3 (Capacity) | Cluster 4 predictive capacity alerts | Cluster 4 | Capacity forecast history |
| A.12.2.1 (Malware) | No user-executed code — agents are the only actors | Architecture | Agent-only policy |
| A.12.4.1 (Logging) | Immutable audit log of every action | Cluster 3 | Governance log (Loki + file) |
| A.12.4.2 (Protection) | Audit log append-only, rotated, backed up | Cluster 5 | Log integrity check |
| A.12.4.3 (Admin logs) | All agent actions logged with agent identity | Cluster 3 | Gov log with agent field |
| A.12.4.4 (Clock sync) | NTP on all nodes | Proxmox | NTP config |

#### A.13 — Communications Security

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.13.1.1 (Network controls) | VLAN segmentation, firewall rules per service | OPNsense | Network topology |
| A.13.1.3 (Segregation) | K3s network policies between namespaces | K8s | NetworkPolicy manifests |
| A.13.2.1 (Info transfer) | Only encrypted channels (HTTPS, WireGuard, SSH) | Architecture | Approved protocols list |

#### A.14 — System Acquisition, Development and Maintenance

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.14.2.1 (Secure development) | CI/CD pipeline with security scans | Pipeline + Cluster 5 | Build log with scan results |
| A.14.2.5 (System changes) | Pre-flight policy enforcement | Cluster 3 | Gov log for every deployment |
| A.14.2.8 (Testing) | Staging namespace + pipeline gates | CI/CD | Staging deploy records |

#### A.16 — Incident Management

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.16.1.1 (Responsibility) | NetWatch detects → Kanban dispatches → specialist remediates | Cluster 1 | Incident history |
| A.16.1.4 (Assessment) | Severity classification + blast radius | Cluster 1 + 3 | Decision log per incident |
| A.16.1.5 (Response) | Playbook execution per incident type | Cluster 1 | Playbook execution records |
| A.16.1.6 (Lessons) | Post-incident KB article (kb-writer) | Cluster 2 | KB articles per incident |
| A.16.1.7 (Evidence) | All incident data preserved for audit | Cluster 5 | Incident evidence package |

#### A.17 — Business Continuity (Phase 2 — not in initial build)

| Control | What We Do | Delivered By | Evidence |
|---------|-----------|-------------|----------|
| A.17.1.1 (BC Plan) | PBS backups + multi-node HA | Proxmox + PBS | Backup schedule + restore tests |
| A.17.2.1 (Redundancy) | 2 firewalls (HA), 6 Proxmox hosts, K3s HA | Infrastructure | Topology |

### 3.3 NIST CSF 2.0 Functions Map

| Function | Category | Our Controls |
|----------|----------|--------------|
| **Govern (GV)** | GV.OC (Organisational Context), GV.SC (Supply Chain), GV.RR (Roles), GV.PO (Policy), GV.OV (Oversight) | Cluster 3 (Policy), Cluster 5 (Compliance), Agent tiers |
| **Identify (ID)** | ID.AM (Asset Management), ID.RM (Risk Management) | Fleet inventory (Tech Watch), SBOM, topology.json |
| **Protect (PR)** | PR.AA (Access Mgmt), PR.AT (Training), PR.AC (Platform Security) | Cluster 3 (Pre-flight), Network policy, Encryption |
| **Detect (DE)** | DE.AE (Security Events), DE.MG (Monitoring) | Cluster 1 (Monitoring + Anomaly Detection), Tech Watch |
| **Respond (RS)** | RS.MA (Incident Mgmt), RS.AN (Analysis), RS.MI (Mitigation) | Cluster 1 (Playbooks + Remediation), Cluster 2 (KB) |
| **Recover (RC)** | RC.RP (Recovery), RC.CO (Communication) | PBS backups, Kubernetes stateless/stateful separation, rollback in pipeline |

---

## 4. Evidence Chain — "Prove It"

### 4.1 What Is the Evidence Chain?

Every autonomous action produces a trail of evidence. The chain has four links:

```
ACTION
  │
  ├─ POLICY DECISION    (gov log: whether it was allowed, which rule, who decided)
  │
  ├─ EXECUTION RECORD   (deployment log: what changed, image tag, rollback state)
  │
  ├─ VERIFICATION        (health check: did the change survive? did it fix the problem?)
  │
  └─ KNOWLEDGE LOG      (KB article: why was this done? what was learned?)
```

An auditor can start at any link and follow the chain to every other link.

### 4.2 Evidence Sources

| Evidence Source | What It Contains | Retention | Format | Trustee |
|----------------|-----------------|-----------|--------|---------|
| **Governance Log** | Every pre-flight decision: agent, action, policy, decision, outcome | 1 year (3 years customer) | JSONL in /var/log/governance/ | Immutable file |
| **Deployment Log** | Every pipeline run: image tag, commit hash, deploy target, result | 1 year | GitHub Actions + K8s event log | GitHub + K3s |
| **Incident Log** | Every P1-P4: severity, detection time, response time, playbook, outcome | 2 years | Dashboard Backend | PostgreSQL |
| **Audit Trail** | Every policy override, human approval, blocked action | 3 years | Governance Log + Telegram | Immutable file |
| **KB Change History** | Every KB article edit with author, timestamp, diff | Forever | Outline | Outline DB |
| **SBOM Archive** | Software Bill of Materials for every deployed image | 1 year | O'Malley/SPDX 2.3 | Object storage |
| **Scanner Results** | Dependency CVE scan reports per image | 1 year | JSON report per build | Object storage |
| **Network Flow Logs** | Connection logs between services (metadata only, no payload) | 90 days | Loki | Log store |
| **Backup Verification** | PBS backup tests: restore test results | 1 year | PBS log | Backup server |

### 4.3 Evidence Freshness — "Are We Still Compliant?"

Every evidence source has a **freshness SLA**. If a source stops producing data, the compliance portal flags it:

| Evidence Source | Max Age | Check Frequency | Action If Stale |
|----------------|---------|-----------------|-----------------|
| Governance Log entries | < 10 min | Every 5 min | Alert: "Governance log idle" |
| Deployment Log entries | < 24 h | Every 1 h | Alert: "No deployments in 24h" |
| Incident Log entries | < 1 h (during P1) | Continuous | Auto-escalate |
| SBOM entries | < 1 per deployment | Per pipeline run | Block deployment if SBOM fails |
| Scanner results | < 1 per deployment | Per pipeline run | Block deployment if scan fails |
| Backup verification | < 7 days | Weekly cron | Alert: "No backup test this week" |

### 4.4 Evidence Package — One-Click Export

The evidence package is a **generated ZIP** an auditor receives. It contains:

```
evidence-2026-Q2/
├── governance/
│   ├── policy-definitions.yaml        # Current active policies
│   ├── agent-tiers.yaml               # Agent trust tiers
│   └── audit-log-2026-04.jsonl        # Q2 audit entries (April)
│   ├── audit-log-2026-05.jsonl        # Q2 audit entries (May)
│   └── audit-log-2026-06.jsonl        # Q2 audit entries (June)
├── incidents/
│   ├── p1-incidents-2026-Q2.json      # All P1 incidents with timelines
│   ├── p2-incidents-2026-Q2.json      # All P2 incidents
│   ├── sla-compliance-report.json     # SLA: response times, resolution times
│   └── postmortems/                    # KB post-incident articles
├── deployments/
│   ├── deployment-log-2026-Q2.json    # All deployments with image tags
│   ├── change-summary.md              # Human-readable: what changed, when, why
│   └── rollback-record.json           # Any rollbacks that occurred
├── security/
│   ├── sbom-archive/                  # SBOM files per build
│   ├── scanner-reports/               # CVE scan results
│   ├── techwatch-advisories-Q2.json   # Security advisories that affected us
│   └── patch-history.json             # What CVEs were patched, when
├── compliance/
│   ├── iso-27001-mapping.xlsx         # Control-to-evidence mapping
│   ├── soc-2-mapping.xlsx             # Trust criteria mapping
│   ├── nist-csf-mapping.xlsx          # Function-to-control mapping
│   ├── policy-review-log.json         # Policy review history
│   └── exception-list.json            # Active overrides/exceptions
├── architecture/
│   ├── data-flow-diagram.svg          # Auto-generated data flow
│   ├── network-topology.md            # Network segmentation diagram
│   ├── asset-inventory.json           # All assets with classification
│   └── dependency-graph.svg           # Service dependency graph
└── index.json                         # Manifest: what's in this package, generation date
```

---

## 5. The Compliance Dashboard — "At a Glance"

### 5.1 What We Build

The compliance portal lives at `olympus.110lymph.nl/compliance` and presents:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ COMPLIANCE OVERVIEW                                       [Export Evidence]│
│                                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│ │ ISO 27001   │ │ SOC 2      │ │ NIST CSF    │ │ Evidence Freshness   ││
│ │ ████████░░  │ │ ██████░░░░ │ │ █████████░  │ │ ✅ All sources live  ││
│ │ 82% mapped  │ │ 64% mapped │ │ 91% aligned │ │ ⏱ Last check: 2m ago ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘│
│                                                                         │
│ ┌─ RECENT INCIDENTS ────────────────────────────────────────────────┐   │
│ │  #123  P2  disk-pressure     k3s-srv-03   Remediated   12m ago   │   │
│ │  #122  P1  olympus-office   mission-ctrl  Remediated   1h ago    │   │
│ │  #121  P4  cert-expires      fw01         Auto-renewed 3h ago    │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─ POLICY PERFORMANCE ─────────────────────────────────────────────┐    │
│ │  Total actions this month:  1,847                                 │    │
│ │  Blocked:                   12   (0.6%)                           │    │
│ │  Human approvals:           8    (0.4%)                           │    │
│ │  Overrides:                 2    (0.1%)                           │    │
│ │  Policy violations:         0    (0.0%)   ✅                      │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│ ┌─ GAPS REQUIRING ATTENTION ───────────────────────────────────────┐    │
│  │  ⚠ SOC 2 → CC6.1 (Logical Access) — evidence collection not    │    │
│  │          configured for third-party access reviews              │    │
│  │                                                                 │    │
│  │  ⚠ ISO 27001 → A.12.6.1 (Technical Vulnerability Mgmt) —       │    │
│  │          dependency scanning implemented, not yet retroactive   │    │
│  │          for historical images                                  │    │
│  │                                                                 │    │
│  │  ⚠ Maritime → FAL.6 (Data Exchange) — evidence format not      │    │
│  │          yet validated against IMO EDIFACT standards            │    │
│  │                                                                 │    │
│  │  [2 other gaps available for expansion]                         │    │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Sources for the Dashboard

| Dashboard Widget | Data Source | Update Frequency |
|-----------------|-------------|------------------|
| Standards alignment % | Compliance map (YAML config) | On policy change |
| Evidence freshness | Cron check of all evidence sources | Every 5 min |
| Recent incidents | incident_history table (PostgreSQL) | Real-time |
| Policy performance | Governance log (JSONL → aggregated) | Hourly |
| Gaps requiring attention | Compliance gap list (YAML config + scan) | Daily |
| Pending approvals | Governance log entries with REQUIRE_HUMAN_APPROVAL | Real-time |

---

## 6. Security Controls — "What We Actually Do"

### 6.1 Infrastructure Security

| Control | Implementation | Verified By |
|---------|---------------|-------------|
| Firewall | OPNsense HA pair, default-deny, per-service allow | NetWatch port scan |
| Network segmentation | VLANs: Management (10.11.1.x), Ceph (10.2.1.x), K3s (10.75.1.x), Services (172.20.1.x) | Network topology verification |
| TLS everywhere | Let's Encrypt auto-renewal via cert-manager | Certificate expiry monitoring |
| Secrets management | K8s secrets (base64 at rest, encrypted via KMS in future) | Secret audit script |
| SSH access | Key-only, no passwords, agents have unique keys | SSH config audit |

### 6.2 Application Security

| Control | Implementation | Verified By |
|---------|---------------|-------------|
| Image signing | Future: signed container images with cosign | Pipeline gate |
| SBOM generation | CycloneDX or SPDX per build | Pipeline gate (future) |
| Dependency scanning | Trivy or Grype per image | Pipeline gate (future) |
| Secrets scanning | Detect API keys in commits (pre-commit hook or pipeline) | Pipeline gate |
| Runtime scanning | K8s security contexts: read-only root, no privileged, drop capabilities | K8s admission controller |

### 6.3 Operational Security

| Control | Implementation | Verified By |
|---------|---------------|-------------|
| Pre-flight policy | Cluster 3 — every action evaluated before execution | Governance log |
| Change management | Pipeline: PR → test → scan → deploy → verify | CI/CD log |
| Incident response | Cluster 1 — detect → classify → dispatch → remediate → verify | Incident log |
| Backup verification | PBS: weekly restore test to staging | Backup test log |
| Log monitoring | All logs to Loki, alert on error patterns | Grafana alerts |

### 6.4 Data Classification

| Classification | Examples | Handling | Storage |
|---------------|----------|----------|---------|
| **Public** | Marketing content, public docs, this architecture spec | No restriction | Public GitHub, Fumadocs |
| **Internal** | Architecture decisions, incident postmortems, runbooks | Authenticated access | Outline (DEX OAuth) |
| **Confidential** | Infrastructure config, secrets references, audit logs | Restricted to Operations+ | Encrypted at rest, RBAC |
| **Customer** | Customer-specific deployment metadata, evidence packages | Per-customer isolation | Separate namespace, customer-facing encryption |
| **Regulated** | Personal data, audit evidence for certification | Immutable, retention-managed | Object storage with retention policy |

---

## 7. Build Phases

### Phase 1: Compliance Foundation (Us — this weekend)

| Task | Owner | Est. Time | Verification |
|------|-------|-----------|-------------|
| **Standards Alignment Matrix** — ISO 27001 Annex A → our controls → evidence sources | Us | 2h | Document complete, reviewed by Marcus |
| **NIST CSF 2.0 Mapping** — Functions → Categories → our Subcategories | Us | 1h | Mapping table complete |
| **Data Classification Policy** — Public/Internal/Confidential/Customer/Regulated with handling rules | Us | 30 min | Policy document stored in KB |
| **Evidence Freshness Cron** — Weekly check that all evidence sources are producing data | Us | 30 min | Cron fires, alerts if stale |
| **Compliance Gap List** — Open gaps with priority, owner, estimated fix effort | Us | 1h | Living document in KB |

### Phase 2: Compliance Dashboard (Us)

| Task | Owner | Est. Time | Verification |
|------|-------|-----------|-------------|
| **Compliance Overview Page** — Standards %, evidence freshness, recent incidents | Us | 3h | /compliance page on olympus |
| **Policy Performance Widget** — Actions/Blocked/Approvals/Overrides per period | Us | 1.5h | Widget shows live data |
| **Gaps Requiring Attention** — Actionable list from gap config | Us | 1h | Widget shows gaps |
| **Evidence Freshness Gauge** — Green/yellow/red per evidence source | Us | 1h | All sources green |

### Phase 3: Evidence Pipeline (Opus)

| Task | Description |
|------|-------------|
| **Evidence Package Generator** — One-click ZIP export of all auditor artefacts | Generates file structure from 4.4 |
| **SBOM Generator** — CycloneDX SBOM per Docker build, archived per deployment | Attached to pipeline run |
| **Dependency Scanner** — Trivy or Grype scan per build, fail on critical | Pipeline gate |
| **Data Flow Auto-Generator** — From topology.json + network policies → diagram | SVG output in evidence package |
| **Evidence Freshness Checker** — Daemon that monitors all evidence sources | Alerts if any source goes stale |
| **Incident History API** — All P1-P4 with full timeline, queryable | /api/compliance/incidents |

### Phase 4: Customer-Facing Compliance (Opus)

| Task | Description |
|------|-------------|
| **Customer Compliance View** — Per-customer: "here's every action taken on your system" | Isolated view per tenant |
| **SOC 2 Evidence Package** — Tailored export matching SOC 2 trust criteria | Filters evidence for SOC 2 only |
| **Maritime Standards Pack** — IMO FAL + ISM Code evidence mapping | Additional export format |
| **Compliance SLA Dashboard** — "We respond to P1 in 15 min" — with actual vs target | Real-time SLA tracker |

---

## 8. Decision Tree — Audit Readiness Checklist

```
I want to be audit-ready
│
├─ Which framework?
│   ├─ ISO 27001 → Use Phase 1 mapping table, ensure ALL Annex A
│   │               controls have evidence source
│   ├─ SOC 2 → Focus on trust criteria: Security, Availability,
│   │           Confidentiality, Privacy
│   ├─ NIST CSF → Use 3.3 mapping; ensure all 6 functions covered
│   ├─ Maritime → Customer-specific, use base map + add IMO FAL
│   └─ Internal → Use compliance dashboard; no external audit yet
│
├─ Have all Phase 1 items?
│   ├─ Standards matrix → NO → Build matrix first
│   ├─ Data classification → NO → Define and publish
│   ├─ Evidence freshness → NO → Deploy cron
│   └─ Gap list → NO → Audit yourself first
│
├─ Evidence chain complete?
│   ├─ Every Phase 1 control has evidence → NO → Add evidence source
│   ├─ Evidence is immutable → NO → Append-only log required
│   ├─ Evidence has retention → NO → Define retention policy
│   └─ Evidence is exportable → NO → Build evidence package generator
│
├─ Can I pass an auditor walkthrough?
│   ├─ Auditor asks "show me your policies" →
│       Point to compliance portal → /docs/policies
│   ├─ Auditor asks "show me a deployment" →
│       Point to deployment log → filtered by date range
│   ├─ Auditor asks "show me incident response" →
│       Point to incident history → pick any P1
│   ├─ Auditor asks "how do you handle vulnerabilities" →
│       Point to Tech Watch → "here's our queue, here's our SLA"
│   ├─ Auditor asks "show me your evidence is real" →
│       Point to immutable governance log → "append-only, timestamped"
│   └─ Any "I don't know" → Add to gap list → schedule for Phase 2
│
└─ All green → ✅ You can open the books
```

---

## 9. Relationship to Other Clusters

| Cluster | Dependency | What Cluster 5 Uses |
|---------|-----------|---------------------|
| **Cluster 1 (Monitoring)** | Required | Incident history, remediation records, severity SLAs |
| **Cluster 2 (Knowledge)** | Required | KB articles as evidence of learning, playbook version history |
| **Cluster 3 (Governance)** | **Required** | Audit log IS the primary evidence source. Without Cluster 3, Cluster 5 has nothing to prove. |
| **Cluster 4 (Capacity)** | Optional | Capacity forecasts show scalability planning (good for SOC 2 Availability criteria) |

> ⚠ **Critical dependency:** Cluster 5 cannot function without Cluster 3. The governance log (every pre-flight decision, every blocked action, every human approval) is the single most important evidence source. If Cluster 3 is not built, the evidence chain has a gap at its foundation.

---

## 10. Onboarding a New Customer — The Compliance Pitch

When a customer evaluates our platform, we hand them:

1. **Compliance Portal URL** — `olympus.110lymph.nl/compliance` (customer view)
2. **Our Certifications** — "We align to ISO 27001, SOC 2, and NIST CSF. Here's the mapping."
3. **Their Evidence Package** — "Here's every action we've taken on your infrastructure. Every decision logged. Every change approved."
4. **Our SLA** — "P1 incident: detection < 5 min, response < 15 min, remediation < 1h. Here's proof."
5. **Our Vulnerability Management** — "Tech Watch ingests 18+ security feeds. We know about CVEs before they're exploited. Here's our patch SLA."
6. **Our Backups** — "Immutable backups, tested weekly. Here's the restore test log."
7. **Our Change Process** — "Every change goes through pre-flight policy. Here's the approval flow."

> A customer doesn't need to "trust us." They need to **verify us.** Cluster 5 makes verification the default.

---

## 11. Build Summary

| Deliverable | Who | When | Depends On |
|------------|-----|------|-----------|
| Standards Alignment Matrix | **Us** | Phase 1 | — |
| NIST CSF 2.0 Mapping | **Us** | Phase 1 | — |
| Data Classification Policy | **Us** | Phase 1 | — |
| Evidence Freshness Cron | **Us** | Phase 1 | — |
| Compliance Gap List | **Us** | Phase 1 | — |
| Compliance Overview Page | **Us** | Phase 2 | Clusters 1 + 3 data |
| Policy Performance Widget | **Us** | Phase 2 | Cluster 3 governance log |
| Gaps Widget | **Us** | Phase 2 | Gap list config |
| Evidence Freshness Gauge | **Us** | Phase 2 | Evidence freshness cron |
| Evidence Package Generator | **Opus** | Phase 3 | Clusters 1 + 2 + 3 |
| SBOM + Scanner Pipeline Gates | **Opus** | Phase 3 | Pipeline |
| Data Flow Generator | **Opus** | Phase 3 | Topology.json + NetworkPolicy |
| Incident History API | **Opus** | Phase 3 | Cluster 1 incident store |
| Customer Compliance View | **Opus** | Phase 4 | Cluster 3 + per-customer isolation |
| Maritime Standards Pack | **Opus** | Phase 4 | Customer request |
| Compliance SLA Dashboard | **Opus** | Phase 4 | All clusters operational |

---

> **Next step after completing this document:** Write the **Policy API Schema** — the runtime enforcement interface that gives agents a hard, non-bypassable "am I allowed to do X?" check. This is the bridge between Cluster 3's governance design and the actual agent runtime.
