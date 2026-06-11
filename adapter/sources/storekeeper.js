'use strict';
/* Phase 6 - StoreKeeper backup source.
 * Reads the latest scan report StoreKeeper writes as JSON (path configured in
 * mapping.json "backupsSource", resolved relative to the adapter directory).
 * Report shape (tolerant - missing fields degrade gracefully):
 *   { generated: <epoch>, systems: [{
 *       name, status: success|running|failed, lastRun, durationSec, nextRun,
 *       runs: [{ ts, durationSec, sizeGb, status }]   // newest last
 *   }] }
 */
const fs = require('fs');
const path = require('path');

function readBackups(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const systems = (raw.systems ?? []).map(s => {
      const runs = (s.runs ?? []).slice(-5).map(r => ({
        ts: r.ts ?? null,
        durationSec: r.durationSec ?? null,
        sizeGb: r.sizeGb ?? null,
        status: r.status ?? 'success',
        error: r.error ?? null,                  // Phase 7b: surfaced in run details
      }));
      const last = runs[runs.length - 1] ?? {};
      return {
        name: s.name ?? 'unknown',
        status: s.status ?? last.status ?? (runs.length ? 'success' : 'never'),   // Phase 7b: gray never-run
        lastRun: s.lastRun ?? last.ts ?? null,
        durationSec: s.durationSec ?? last.durationSec ?? null,
        nextRun: s.nextRun ?? null,
        runs,
      };
    });
    return { ok: true, generated: raw.generated ?? null, source: path.basename(file), systems };
  } catch (e) {
    return { ok: false, error: 'waiting for StoreKeeper report (' + (e.code || e.message) + ')', systems: [] };
  }
}

module.exports = { readBackups };
