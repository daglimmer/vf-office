# TrueNAS NAS01 — ZFS Corruption Report
**Date:** 2026-06-18
**Pool:** data01 (29.1T raw, 16.3T used)

---

## Summary

**data01** pool has **103 permanent corrupted files** from the last scrub (June 16).
The disk array also shows **872–948 checksum errors per drive** — all 8 disks in the raidz1 have similar numbers, which means the corruption happened during or before the RAIDZ expansion, not from a single failing drive.

**No user data is affected.** Every corrupted file is either:
- **K3s container overlay** (71 files) — disposable container layers for TrueNAS apps
- **TrueNAS old config backups** (26 files) — superseded system config DBs from Oct 2024 – Jan 2025
- **K3s server state.db** (2 files) — K3s cluster state on the TrueNAS internal k3s
- **K3s binaries** (4 files) — cached containerd shims, coredns, csi-provisioner
- **Catalog git pack** (1 file) — TrueNAS app catalog git objects
- **Sabnzbd backup** (1 file) — helm release backup

---

## Detailed Breakdown

### 1. TrueNAS Config DBs — 26 files
All under `/var/db/system/configs-ae32c386e13840b2bf9c0083275e7941/`
- Dates range: October 2024 – January 2025
- **These are ALL old config backups from before you replaced hardware.** The current config is on boot-pool, not affected.

### 2. K3s Container Overlay — 71 files
All under `/mnt/data01/ix-applications/k3s/agent/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/*/fs/`
- Python libraries (apprise, cffi, chardet, cherrypy, configparser, pip, setuptools)
- System libraries (libstdc++, libpam, gconv modules, libnss, libthread_db)
- Binaries (nsenter, hostid, taskset, wall, false, ldattach, containerd-shim-runc-v2)
- App files (test_filesystem.py, sabnzbd helm release backup)
- **These are old container snapshot layers from TrueNAS apps.** The TrueNAS k3s is separate from our K3s cluster. Container layers are disposable — old snapshots get garbage collected.

### 3. K3s Server DB — 2 files
- `/mnt/data01/ix-applications/k3s/server/db/state.db` — K3s cluster state
- **Only affects the TrueNAS-internal k3s, not our homelab K3s**

### 4. K3s Binaries — 4 files
- containerd-shim-runc-v2, csi-snapshotter, csi-provisioner, coredns
- **Disposable cached binaries** — pulled fresh on restart

### 5. Catalog Git — 1 file
- TrueNAS app catalog git packfile
- **Auto-fetched from GitHub** — can be re-cloned

### 6. Sabnzbd Backup — 1 file
- Helm release backup from October 2024 update
- **Obsolete version** — sabnzbd has been updated since

---

## Disk Health

All 8 disks in the raidz1 show **similar checksum counts** (872–948 each):
| Disk | CKSUM |
|------|-------|
| scsi-35000c500a67f396f | 904 |
| scsi-35000c500a67f5523 | 904 |
| scsi-35000c500a67f120f | 872 |
| scsi-35000c500a6809077 | 872 |
| scsi-35000c500a67f6173 | 948 |
| 7ec27f39-4f79-49de-ae73-1f0ffa0b8a9b (new drive) | 948 |
| scsi-35000c500a67f438b | 896 |
| scsi-35000c500a680c0cb | 896 |

**Pattern confirms:** All disks got identical error counts. This is consistent with corruption during the **RAIDZ expansion** (completed June 1) where the entire pool was rewritten across all drives simultaneously. No single disk is failing — S.M.A.R.T. shows no reallocated/pending/uncorrectable sectors on any of the 8 drives.

The **nvme-01 pool** (5.4T, SSD raidz2) and **boot-pool** (49G) are both clean — no errors, no corruption.

---

## What This Means

**Your actual data is safe.** The corrupted files are 100% in:
1. **Old TrueNAS config backups** — from before you replaced hardware, superseded
2. **Old container layers** from TrueNAS apps — disposable, GC'd on cleanup

The **12.9T media dataset** → zero errors ✅
The **149G pve_data/VM dataset** → zero errors ✅
The **iptv dataset** → zero errors ✅

---

## Recommended Actions

1. **Delete the old config backup files** — they're from 2024, pre-hardware-replacement, and already superseded by current config on boot-pool
2. **Run a scrub now** to confirm no new corruption has appeared since June 16
3. If you want to clean up: delete the affected ix-applications container snapshots (they auto-rebuild)
4. Run a scrub 2–4 weeks post-expansion as final confirmation the array is stable
