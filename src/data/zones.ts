// ─── Zone Configuration — Ray's Grid Layout (2026-05-17) ────────
// 12×8 grid, 8 zones. Full-width corridor at row 4.
// Server Room: 2×3 (cols 0-1, rows 0-2) — raised-floor compute
// Patch Room: 3×2 (cols 2-4, rows 0-1) — network termination
// Vault: 3×2 (cols 5-7, rows 0-1) — secure storage
// Lounge: 2×4 (cols 8-9, rows 0-3) — social/consult area
// Data Centre: 2×3 (cols 0-1, rows 5-7) — cluster infrastructure
// Oly's Office: 2×3 (cols 2-3, rows 5-7) — command center
// Meeting Room: 3×3 (cols 4-6, rows 5-7) — conference room
// The Office: 3×3 (cols 7-9, rows 5-7) — Ray's private office
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

export const ZONES: ZoneConfig[] = [
  {
    id: 'server_room',
    label: 'Server Room',
    icon: '🖥️',
    color: '#ef4444',
    description: '3× 84U racks. 9 hosts online. Compute backbone of the lab.',
    col: 0, row: 0, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'patch_room',
    label: 'Patch Room',
    icon: '🔌',
    color: '#f97316',
    description: 'Patch panels and network termination. DSW/ASW switch stacks. Cross-connects to all zones.',
    col: 2, row: 0, colSpan: 3, rowSpan: 2,
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: '🔐',
    color: '#d97706',
    description: 'Reinforced secure storage vault. Backup archives, secrets, cold storage.',
    col: 5, row: 0, colSpan: 3, rowSpan: 2,
  },
  {
    id: 'lounge',
    label: 'Lounge Area',
    icon: '🛋️',
    color: '#f59e0b',
    description: 'Consulting, debrief & chill-out zone. Convertible lounge chairs, coffee table, whiteboard.',
    col: 8, row: 0, colSpan: 2, rowSpan: 4,
  },
  {
    id: 'datacenter',
    label: 'Data Centre',
    icon: '📡',
    color: '#10b981',
    description: 'Cluster infrastructure — 3 racks, 9 hosts. High-density compute. Ground floor left wing.',
    col: 0, row: 5, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'oly_office',
    label: "Oly's Office",
    icon: '⚙️',
    color: '#a78bfa',
    description: "Oly's command center. Sleek desk, dual monitors, bookshelf. Mission control HQ.",
    col: 2, row: 5, colSpan: 2, rowSpan: 3,
  },
  {
    id: 'meeting',
    label: 'Meeting Room',
    icon: '📋',
    color: '#3b82f6',
    description: 'Team conference room. Oval table with 8 leather chairs, projector screen. Specialist debriefs & planning.',
    col: 4, row: 5, colSpan: 3, rowSpan: 3,
  },
  {
    id: 'the_office',
    label: 'The Office',
    icon: '🏢',
    color: '#6366f1',
    description: "Modern open-plan office. 6 compact tech desks in a 2×3 grid. Strategic command post.",
    col: 7, row: 5, colSpan: 3, rowSpan: 3,
  },
]

// ─── Workflow Phases ────────────────────────────────────────────────
export interface WorkflowPhase {
  id: string
  label: string
  icon: string
  color: string
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  { id: 'consulting', label: 'Consulting', icon: '🤝', color: '#f59e0b' },
  { id: 'working', label: 'Doing the Work', icon: '⚙️', color: '#22c55e' },
  { id: 'debrief', label: 'Debrief', icon: '📋', color: '#a78bfa' },
  { id: 'documenting', label: 'Documenting', icon: '📝', color: '#3b82f6' },
  { id: 'idle', label: 'Idle', icon: '☕', color: '#6b7280' },
]
