// ─── Zone Configuration — Professional Corporate Futurism (2026-05-18) ──
// 12×8 grid, 8 zones. Full-width corridor at row 4.
// Server Room: 2×3 (cols 0-1, rows 0-2) — blue-lit compute corridor
// Patch Room: 3×2 (cols 2-4, rows 0-1) — network termination
// Vault: 3×2 (cols 5-7, rows 0-1) — secure storage
// Lounge: 2×4 (cols 8-9, rows 0-3) — luxury lounge with fireplace
// Data Centre: 2×3 (cols 0-1, rows 5-7) — circular command room
// Oly's Office: 2×3 (cols 2-3, rows 5-7) — minimalist command center
// Meeting Room: 3×3 (cols 4-6, rows 5-7) — conference room
// The Office: 3×3 (cols 7-9, rows 5-7) — Ray's private office + Tech Desk
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

// ─── Professional Corporate Color Palette ──────────────────────────
// Distinct architectural identity per zone. Clean, professional,
// inspired by reference imagery — no cyberpunk neon swaps.
export const ZONES: ZoneConfig[] = [
  {
    id: 'server_room',
    label: 'Server Room',
    icon: '🖥️',
    color: '#2299dd',
    description: '8 racks in dual-row corridor. Blue-lit compute backbone. Cool cyan edge lighting, polished floor.',
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
    description: 'Luxurious symmetrical lounge. Limestone fireplace, taupe sofas, teal chairs, oak paneling.',
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
    description: 'Team conference room. Oval table with 8 leather chairs, projector screen. Specialist debriefs & planning.',
    col: 4, row: 5, colSpan: 3, rowSpan: 3,
  },
  {
    id: 'the_office',
    label: 'The Office',
    icon: '🏢',
    color: '#6677aa',
    description: "Modern open-plan office. Tech desks + Ray's command post. Strategic operations center.",
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
  { id: 'consulting', label: 'Consulting', icon: '🤝', color: '#dd9944' },
  { id: 'working', label: 'Doing the Work', icon: '⚙️', color: '#44aa66' },
  { id: 'debrief', label: 'Debrief', icon: '📋', color: '#8866bb' },
  { id: 'documenting', label: 'Documenting', icon: '📝', color: '#4488bb' },
  { id: 'idle', label: 'Idle', icon: '☕', color: '#667788' },
]
