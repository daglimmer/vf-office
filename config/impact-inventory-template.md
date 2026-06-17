# Impact Inventory

> **Template for blast radius ≥ 5 actions** (Cluster-wide, infrastructure, or multi-customer changes).
>
> Agents MUST complete this template BEFORE executing any action where the Policy API returns `REQUIRE_INVENTORY_AND_APPROVAL`. Submit it for human approval via the approval gateway.

---

## Request

| Field | Value |
|-------|-------|
| **Gov ID** | `gov-<YYYYMMDD>-<NNNN>` |
| **Agent** | `<agent_name>` |
| **Requested by** | `<user_or_trigger>` |
| **Timestamp** | `<ISO_8601>` |
| **Incident ID** | `<incident_id>` or `none` |

---

## What I'm About to Do

```
<One-line description of the action>

<Detailed description — what command, what config change, what deployment>
```

---

## Impact Assessment

### What's impacted if this goes wrong

| Component | Type | Criticality | Users Affected |
|-----------|------|-------------|----------------|
| `<component>` | Service / Infrastructure / Data | Critical / High / Medium / Low | `<who loses access>` |
| `<component>` | Service / Infrastructure / Data | Critical / High / Medium / Low | `<who loses access>` |

### Blast radius

- **Scale:** `5` (Cluster-wide) / `6` (Infrastructure) / `7` (Multi-customer)
- **Customer-facing:** Yes / No
- **Data loss risk:** Yes / No *(if yes, describe backup state)*

---

## Rollback Plan

| Step | Command / Action | Expected Outcome | Est. Time |
|------|-----------------|------------------|-----------|
| 1 | `<revert command>` | `<what should happen>` | `<time>` |
| 2 | `<verify command>` | `<what should happen>` | `<time>` |

**Total rollback time (estimated):** `<minutes>`

**Rollback tested:** Yes / No *(if yes, include date of last test)*

---

## Risk Assessment

| Factor | Assessment |
|--------|-----------|
| **Probability of failure** | Low / Medium / High — *explain why* |
| **Impact if failure** | Low / Medium / High — *explain what breaks* |
| **Mitigation in place** | `<list mitigations>` |
| **Deployment window** | Business hours / Maintenance window / Out of hours |
| **Requires notification** | #homelab / #customer-channel / None |

---

## Approval

| Approver | Decision | Timestamp |
|----------|----------|-----------|
| `<name>` | ✅ Approved / ❌ Denied / ⏳ Pending | `<ISO_8601>` |

### Post-action result

| Outcome | Notes |
|---------|-------|
| ✅ Succeeded / ❌ Failed / 🔄 Rolled back | `<any notes>` |

---

> *This inventory becomes part of the permanent audit trail. Filed under `/var/log/governance/impact-inventories/gov-<id>.md`*
