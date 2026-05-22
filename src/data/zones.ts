// ─── 2D Room Configuration ──────────────────────────────────────────
// SVG viewBox: 0 0 1200 900. Left column 40%, right 60%.
// Corridor: horizontal y=400-420, vertical x=475-490

export interface RoomConfig {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  description: string
  x: number; y: number; w: number; h: number
}

export const ROOMS: RoomConfig[] = [
  {
    id: 'datacenter', label: 'DATA CENTER', icon: '🖥️',
    color: '#2299dd', bgColor: '#0a1628',
    description: 'Infrastructure work zone — servers, networking, compute backbone.',
    x: 10, y: 10, w: 455, h: 185,
  },
  {
    id: 'oly_office', label: "OLY'S OFFICE", icon: '⚙️',
    color: '#06b6d4', bgColor: '#0a1a1a',
    description: 'Command center — Oly coordinates operations from here.',
    x: 10, y: 205, w: 455, h: 185,
  },
  {
    id: 'lounge', label: 'LOUNGE', icon: '☕',
    color: '#c4a882', bgColor: '#1a120d',
    description: 'Idle zone — specialists rest and recharge between tasks.',
    x: 10, y: 430, w: 455, h: 225,
  },
  {
    id: 'ceo_office', label: 'CEO OFFICE', icon: '🧠',
    color: '#f59e0b', bgColor: '#1a1408',
    description: 'Strategy and oversight — CEO is always on station here.',
    x: 10, y: 665, w: 455, h: 225,
  },
  {
    id: 'meeting', label: 'MEETING ROOM', icon: '📋',
    color: '#a855f7', bgColor: '#120d1a',
    description: 'Consulting sessions — specialists gather for debriefs and planning.',
    x: 500, y: 10, w: 690, h: 380,
  },
  {
    id: 'team_office', label: 'TEAM OFFICE', icon: '🏢',
    color: '#6677aa', bgColor: '#0d0f1a',
    description: 'Documenting zone — open-plan office for reports and documentation.',
    x: 500, y: 430, w: 690, h: 460,
  },
]

// ─── Status Colors ───────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  working: '#22c55e', consulting: '#a855f7', debrief: '#f59e0b',
  documenting: '#06b6d4', idle: '#64748b',
}
export const STATUS_LABELS: Record<string, string> = {
  working: 'Working', consulting: 'Consulting', debrief: 'Debrief',
  documenting: 'Documenting', idle: 'Idle',
}

// ─── Status → Room routing ───────────────────────────────────────────
export function getRoomId(spec: { name: string; status: string }): string {
  if (spec.name === 'ceo') return 'ceo_office'
  const s = spec.status
  if (s === 'consulting' || s === 'debrief') return 'meeting'
  if (s === 'idle') return 'lounge'
  if (s === 'documenting') return 'team_office'
  if (s === 'working' && (spec.name === 'oly' || spec.name === 'Oly')) return 'oly_office'
  if (s === 'working') return 'datacenter'
  return 'lounge'
}
