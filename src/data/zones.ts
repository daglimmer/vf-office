// ─── Zone Configuration — Dark Theme Corporate Futurism ──────────────
// 12×8 grid, 8 zones. Full-width corridor at row 4.
// Server Room: 2×3 (cols 0-1, rows 0-2) — blue-lit compute corridor
// Patch Room: 3×2 (cols 2-4, rows 0-1) — network termination
// Vault: 3×2 (cols 5-7, rows 0-1) — secure storage
// Lounge: 2×4 (cols 8-9, rows 0-3) — luxury lounge with fireplace
// Data Centre: 2×3 (cols 0-1, rows 5-7) — circular command room
// Oly's Office: 2×3 (cols 2-3, rows 5-7) — minimalist command center
// Meeting Room: 3×3 (cols 4-6, rows 5-7) — conference room
// The Office: 3×3 (cols 7-9, rows 5-7) — tech open-plan office
// Corridor: row 4 (full width), cols 2-7 rows 2-3 (open space)

export interface ZoneConfig {
  id: string
  label: string
  icon: string
  color: string
  description: string
  // Grid position: col (0-11), row (0-7), spanCols, spanRows
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

// ─── Dark Theme Color Palette ─────────────────────────────────────────
// Distinct architectural identity per zone, tuned for dark navy/charcoal floor.
export const ZONES: ZoneConfig[] = [
  {
    id: 'server_room',
    label: 'Server Room',
    icon: '🖥️',
    color: '#2299dd',
    description: '8 racks in dual-row corridor. Blue-lit compute backbone with cool cyan edge lighting and polished floor.',
    col: 0, row: 0, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'patch_room',
    label: 'Patch Room',
    icon: '🔌',
    color: '#dd8833',
    description: 'Patch panels and network termination. DSW/ASW switch stacks. Cross-connects to all zones.',
    col: 2, row: 0, colSpan: 3, rowSpan: 2,
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: '🔐',
    color: '#aa9966',
    description: 'Reinforced secure storage vault. Backup archives, secrets, cold storage.',
    col: 5, row: 0, colSpan: 3, rowSpan: 2,
  },
  {
    id: 'lounge',
    label: 'Lounge Area',
    icon: '🛋️',
    color: '#c4a882',
    description: 'Luxurious symmetrical lounge. Fireplace, taupe sofas, teal chairs. Specialist respite and casual meetings.',
    col: 8, row: 0, colSpan: 2, rowSpan: 4,
  },
  {
    id: 'datacenter',
    label: 'Data Centre',
    icon: '📡',
    color: '#00aacc',
    description: 'Circular command room. Cylindrical ceiling display, curved wall screens, glowing platform.',
    col: 0, row: 5, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'oly_office',
    label: "Oly's Office",
    icon: '⚙️',
    color: '#5599bb',
    description: "Minimalist command center. Dual monitors, white slab desk, holographic data, window wall.",
    col: 2, row: 5, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'meeting',
    label: 'Meeting Room',
    icon: '📋',
    color: '#5566aa',
    description: 'Team conference room. Oval table with 8 chairs, projector screen. Specialist debriefs & planning.',
    col: 4, row: 5, colSpan: 3, rowSpan: 3,
  },
  {
    id: 'the_office',
    label: 'The Office',
    icon: '🏢',
    color: '#6677aa',
    description: "Modern open-plan office. Tech desks and command post. Strategic operations center.",
    col: 7, row: 5, colSpan: 3, rowSpan: 3,
  },
]

// ─── Workflow Phases ──────────────────────────────────────────────────
export interface WorkflowPhase {
  id: string
  label: string
  icon: string
  color: string
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  { id: 'consulting', label: 'Consulting', icon: '🤝', color: '#a855f7' },
  { id: 'working', label: 'Doing the Work', icon: '⚙️', color: '#22c55e' },
  { id: 'debrief', label: 'Debrief', icon: '📋', color: '#f59e0b' },
  { id: 'documenting', label: 'Documenting', icon: '📝', color: '#06b6d4' },
  { id: 'idle', label: 'Idle', icon: '☕', color: '#64748b' },
]

// ─── Status Color Mapping ─────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  consulting: '#a855f7',   // purple
  working: '#22c55e',      // green
  debrief: '#f59e0b',      // amber
  reporting: '#f59e0b',    // amber (legacy alias)
  documenting: '#06b6d4',  // teal
  idle: '#64748b',         // gray
}

export const STATUS_LABELS: Record<string, string> = {
  consulting: 'Consulting',
  working: 'Working',
  debrief: 'Debriefing',
  reporting: 'Debriefing',
  documenting: 'Documenting',
  idle: 'Idle',
}

// ─── Specialist Zone Assignments ──────────────────────────────────────
export const SPECIALIST_ZONES: Record<string, string> = {
  oly: 'oly_office',
  builder: 'datacenter',
  sentry: 'datacenter',
  bulwark: 'server_room',
  archive: 'vault',
  sage: 'the_office',
  haven: 'lounge',
  ledger: 'the_office',
}

// Status → zone mapping (phase-based routing override)
export const STATUS_ZONE_MAP: Record<string, string> = {
  consulting: 'meeting',
  debrief: 'meeting',
  reporting: 'meeting',
  documenting: 'the_office',
  idle: 'lounge',
}

// ─── Specialist Identity Colors ───────────────────────────────────────
export const SPECIALIST_COLORS: Record<string, string> = {
  oly: '#00ccff',
  builder: '#22c55e',
  sentry: '#4488ff',
  bulwark: '#ef4444',
  archive: '#f59e0b',
  sage: '#a855f7',
  haven: '#22c55e',
  ledger: '#ec4899',
}

// ─── Specialist Emoji Map ─────────────────────────────────────────────
export const SPECIALIST_EMOJIS: Record<string, string> = {
  oly: '⚙️',
  builder: '📦',
  sentry: '🌐',
  bulwark: '🖥️',
  archive: '💾',
  sage: '🧠',
  haven: '🏠',
  ledger: '🏦',
}
