import React, { useState, useEffect } from 'react'
import FloorPlan3D from './components/FloorPlan3D'
import WorkflowBar from './components/WorkflowBar'
import ZoneInfoPanel from './components/ZoneInfoPanel'
import { ZoneConfig } from './data/zones'

const API_BASE = '/api'

// ─── Default Standalone Specialists — shown when API unavailable ───
// NOTE: zone is intentionally NOT set here — FloorPlan3D resolves zone from
// status via STATUS_ZONE_MAP for correct phase-to-zone routing.
// Idle → Lounge | Consulting/Debrief → Meeting | Documenting → The Office
// Working → per-specialist assigned zone
const DEFAULT_SPECIALISTS: SpecialistData[] = [
  { name: 'oly',    emoji: '⚙️',  status: 'idle'        },
  { name: 'builder',emoji: '📦',  status: 'working'     },
  { name: 'sentry', emoji: '🌐',  status: 'consulting'  },
  { name: 'bulwark',emoji: '🖥️',  status: 'working'     },
  { name: 'archive',emoji: '💾',  status: 'documenting' },
  { name: 'sage',   emoji: '🧠',  status: 'debrief'     },
  { name: 'haven',  emoji: '🏠',  status: 'idle'        },
  { name: 'ledger', emoji: '🏦',  status: 'consulting'  },
]

// Map status to workflow phase ID for the bar
const STATUS_PHASE_MAP: Record<string, string> = {
  consulting: 'consulting',
  working: 'working',
  debrief: 'debrief',
  reporting: 'debrief',
  documenting: 'documenting',
  idle: 'idle',
}

// ─── Map Backend zone names → Frontend zone IDs ────────────────────
// Backend returns: desk, data_center, meeting, consult:<name>
// Frontend expects: the_office, datacenter, meeting, lounge, server_room, etc.
const BACKEND_ZONE_MAP: Record<string, string> = {
  desk: 'the_office',
  data_center: 'datacenter',
  meeting: 'meeting',
  lounge: 'lounge',
  server_room: 'server_room',
  patch_room: 'patch_room',
  vault: 'vault',
  oly_office: 'oly_office',
}

// ─── Map Backend specialist names (capitalized) → Frontend keys ───
const BACKEND_NAME_MAP: Record<string, string> = {
  Builder: 'builder',
  Sentry: 'sentry',
  Archive: 'archive',
  Bulwark: 'bulwark',
  Sage: 'sage',
  Haven: 'haven',
  Ledger: 'ledger',
  Oly: 'oly',
}

/** Convert backend API response specialists to frontend SpecialistData format */
function mapApiSpecialists(apiSpecialists: any[]): SpecialistData[] {
  return apiSpecialists.map((s: any) => {
    const rawName = s.name || s.id || ''
    const frontendName = BACKEND_NAME_MAP[rawName] || rawName.toLowerCase()
    const rawZone = s.zone || ''
    // Handle consult: prefix (e.g., "consult:builder" → meeting room)
    const frontendZone = rawZone.startsWith('consult:')
      ? 'meeting'
      : (BACKEND_ZONE_MAP[rawZone] || rawZone)
    return {
      name: frontendName,
      status: s.status || 'idle',
      phase: s.phase || STATUS_PHASE_MAP[s.status || 'idle'] || 'idle',
      task: s.task_label || s.task || undefined,
      task_label: s.task_label || undefined,
      task_runtime: s.task_runtime || undefined,
      started_at: s.started_at ? String(s.started_at) : undefined,
      zone: frontendZone,
      emoji: s.emoji || undefined,
    }
  })
}

export interface SpecialistData {
  name: string
  status?: string
  phase?: string
  task?: string
  task_label?: string
  task_runtime?: number
  started_at?: string
  zone?: string
  emoji?: string
}

interface VFStatus {
  state: Record<string, any>
  specialists: SpecialistData[]
  active_specialists?: string[]
}

export default function App() {
  const [selectedZone, setSelectedZone] = useState<ZoneConfig | null>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<string>('idle')
  const [status, setStatus] = useState<VFStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use API specialists when available, fall back to defaults
  const specialists: SpecialistData[] = status?.specialists?.length
    ? mapApiSpecialists(status.specialists)
    : DEFAULT_SPECIALISTS

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fixed: /status → /activity (matches backend router)
        const res = await fetch(`${API_BASE}/visual-office/activity`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          setError(null)
          // Derive activePhase from specialist statuses (status-based routing)
          if (data.specialists?.length) {
            const phasePriority = ['consulting', 'working', 'debrief', 'documenting', 'idle']
            const statuses = new Set(data.specialists.map((s: any) => s.status))
            const active = phasePriority.find(p => statuses.has(p)) || 'idle'
            setActivePhase(active)
          }
        } else {
          setError(null)
        }
      } catch {
        setError(null)
      }
    }
    fetchStatus()
    // Poll every 30 seconds so agents move when phases change
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handlePhaseClick = (phaseId: string) => {
    setActivePhase(phaseId)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#040811]">
      <WorkflowBar activePhase={activePhase} onPhaseClick={handlePhaseClick} specialists={specialists} />

      <div className="flex-1 relative">
        <FloorPlan3D
          selectedZone={selectedZone}
          onSelectZone={(zone) => setSelectedZone(zone === selectedZone ? null : zone)}
          hoveredZone={hoveredZone}
          onHoverZone={setHoveredZone}
          specialists={specialists}
          activePhase={activePhase}
        />

        <ZoneInfoPanel zone={selectedZone} onClose={() => setSelectedZone(null)} />

        {hoveredZone && !selectedZone && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-3 py-1.5 rounded-md bg-[#080c18]/95 border border-[#00ccff]/30 text-xs text-[#c8d0e0]">
              Click for details
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="text-[10px] text-[#556688]/60 space-y-0.5 text-right">
            <div>🖱 Drag to rotate</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click zone for info</div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex items-center gap-1.5 text-[10px] text-[#8899bb]/80">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${status ? 'bg-[#00ff88] shadow-[0_0_6px_#00ff88]' : 'bg-[#ffaa00] shadow-[0_0_6px_#ffaa00]'}`} />
            <span>{status ? 'API Connected' : `Standalone · ${specialists.length} agents`}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 bg-[#080c18]/90 border-t border-[#1a3355]/40">
        <div className="flex items-center gap-3 text-[10px] text-[#6c7a8d]">
          <span className="text-[#39bae6] font-bold">⚙️ VF</span>
          <span>3D Visual Office</span>
          <span className="text-[#1a3355]">|</span>
          <span>v0.6.0 · Phase Routing Fixed (2026-05-18)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#8899bb]">
          <span>🏢 8 Zones</span>
          <span className="text-[#1a3355]">|</span>
          <span>🖥️ 4 Racks</span>
          <span className="text-[#1a3355]">|</span>
          <span>🌐 7 Switches</span>
        </div>
      </div>
    </div>
  )
}
