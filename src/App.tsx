import React, { useState, useEffect, useCallback } from 'react'
import FloorPlan3D from './components/FloorPlan3D'
import { ZONES, ZoneConfig } from './data/zones'

// ─── Types ──────────────────────────────────────────────────────────
export interface SpecialistData {
  name: string
  status: string
  zone?: string
  emoji?: string
  task_label?: string
  task_runtime?: number
  started_at?: string
}

interface ActivityResponse {
  specialists: SpecialistData[]
}

// ─── Zone mapping (backend → frontend) ──────────────────────────────
const ZONE_MAP: Record<string, string> = {
  desk: 'the_office',
  data_center: 'datacenter',
  meeting: 'meeting',
  lounge: 'lounge',
  server_room: 'server_room',
  patch_room: 'patch_room',
  vault: 'vault',
  oly_office: 'oly_office',
}

const NAME_MAP: Record<string, string> = {
  Builder: 'builder', Sentry: 'sentry', Archive: 'archive',
  Bulwark: 'bulwark', Sage: 'sage', Haven: 'haven',
  Ledger: 'ledger', Oly: 'oly',
}

const DEFAULT_SPECIALISTS: SpecialistData[] = [
  { name: 'oly', emoji: '🧠', status: 'idle' },
  { name: 'builder', emoji: '🛠️', status: 'working' },
  { name: 'sentry', emoji: '🔒', status: 'consulting' },
  { name: 'bulwark', emoji: '🛡️', status: 'working' },
  { name: 'archive', emoji: '📚', status: 'documenting' },
  { name: 'sage', emoji: '📝', status: 'debrief' },
  { name: 'haven', emoji: '💾', status: 'idle' },
  { name: 'ledger', emoji: '⚡', status: 'consulting' },
]

// ─── Color by status ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  working: '#22c55e',
  consulting: '#a855f7',
  debrief: '#f59e0b',
  documenting: '#06b6d4',
  idle: '#64748b',
}

const STATUS_LABELS: Record<string, string> = {
  working: 'Working',
  consulting: 'Consulting',
  debrief: 'Debrief',
  documenting: 'Documenting',
  idle: 'Idle',
}

// ─── App ────────────────────────────────────────────────────────────
export default function App() {
  const [specialists, setSpecialists] = useState<SpecialistData[]>(DEFAULT_SPECIALISTS)
  const [selectedZone, setSelectedZone] = useState<ZoneConfig | null>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [panel, setPanel] = useState<'none' | 'crew' | 'activity'>('crew')
  const [apiOnline, setApiOnline] = useState(false)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-office/activity')
      if (!res.ok) throw new Error('API down')
      const data: ActivityResponse = await res.json()
      setApiOnline(true)
      if (data.specialists?.length) {
        setSpecialists(data.specialists.map((s: any) => {
          const rawName = s.name || s.id || ''
          const rawZone = s.zone || ''
          return {
            name: NAME_MAP[rawName] || rawName.toLowerCase(),
            status: s.status || 'idle',
            zone: rawZone.startsWith('consult:')
              ? 'meeting'
              : (ZONE_MAP[rawZone] || rawZone),
            emoji: s.emoji,
            task_label: s.task_label || s.task,
            task_runtime: s.task_runtime,
            started_at: s.started_at ? String(s.started_at) : undefined,
          }
        }))
      }
    } catch {
      setApiOnline(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 5000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  // Count specialists in each status
  const working = specialists.filter(s => s.status === 'working').length
  const active = specialists.filter(s => s.status !== 'idle').length

  return (
    <div className="w-screen h-screen bg-[#0a0d14] relative overflow-hidden font-sans">
      {/* ─── 3D Scene ─── */}
      <FloorPlan3D
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        hoveredZone={hoveredZone}
        onHoverZone={setHoveredZone}
        specialists={specialists}
      />

      {/* ─── Top Bar ─── */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-[#0d1117]/90 backdrop-blur border-b border-[#1a2235] flex items-center px-4 gap-4 z-10">
        <span className="text-[#39bae6] font-bold text-sm">⚙️ VF</span>
        <span className="text-[#6c7a8d] text-xs">3D Visual Office</span>
        <span className="text-[#6c7a8d] text-xs">|</span>
        <span className="text-[#8899aa] text-xs">v0.9.0</span>
        <div className="flex-1" />
        <span className="text-[#8899aa] text-xs">
          🏢 {ZONES.length} Zones · 👤 {specialists.length} Agents
        </span>
        <span className={`text-xs ${apiOnline ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {apiOnline ? '● Live' : '○ Offline'}
        </span>
        <button
          onClick={() => setPanel(p => p === 'crew' ? 'none' : 'crew')}
          className={`text-xs px-2 py-1 rounded ${panel === 'crew' ? 'bg-[#1a3355] text-[#39bae6]' : 'text-[#6c7a8d] hover:text-[#8899aa]'}`}
        >
          👥 Crew
        </button>
        <button
          onClick={() => setPanel(p => p === 'activity' ? 'none' : 'activity')}
          className={`text-xs px-2 py-1 rounded ${panel === 'activity' ? 'bg-[#1a3355] text-[#39bae6]' : 'text-[#6c7a8d] hover:text-[#8899aa]'}`}
        >
          📋 Zones
        </button>
      </div>

      {/* ─── Crew Panel ─── */}
      {panel === 'crew' && (
        <div className="absolute top-12 right-3 w-64 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-h-[calc(100vh-80px)] overflow-y-auto">
          <h3 className="text-[#e0e8f0] font-semibold text-sm mb-2">
            👥 Crew ({active} active · {working} working)
          </h3>
          <div className="space-y-1">
            {specialists.map(s => (
              <div key={s.name} className="flex items-center gap-2 text-xs py-1 border-b border-[#1a2235]/50">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s.status] || STATUS_COLORS.idle }}
                />
                <span>{s.emoji || '👤'}</span>
                <span className="text-[#c8d0e0] capitalize font-medium w-16">{s.name}</span>
                <span className="text-[#6c7a8d] flex-1 truncate">
                  {STATUS_LABELS[s.status] || s.status}
                </span>
                {s.task_label && (
                  <span className="text-[#556677] truncate max-w-[120px]" title={s.task_label}>
                    {s.task_label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Zones Panel ─── */}
      {panel === 'activity' && (
        <div className="absolute top-12 right-3 w-64 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-h-[calc(100vh-80px)] overflow-y-auto">
          <h3 className="text-[#e0e8f0] font-semibold text-sm mb-2">📋 Zones</h3>
          <div className="space-y-2">
            {ZONES.map(z => {
              const count = specialists.filter(s => {
                // Match specialist to zone
                if (s.status === 'consulting' || s.status === 'debrief') return z.id === 'meeting'
                if (s.status === 'idle') return z.id === 'lounge'
                if (s.status === 'documenting') return z.id === 'the_office'
                if (s.zone === z.id) return true
                return false
              }).length
              return (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(selectedZone?.id === z.id ? null : z)}
                  className={`w-full text-left p-2 rounded text-xs transition ${
                    selectedZone?.id === z.id
                      ? 'bg-[#1a3355] border border-[#39bae6]/30'
                      : 'hover:bg-[#111a28] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{z.icon}</span>
                    <span className="text-[#c8d0e0] font-medium">{z.label}</span>
                    {count > 0 && (
                      <span className="ml-auto text-[#6c7a8d]">{count} agent{count !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {selectedZone?.id === z.id && (
                    <p className="text-[#6c7a8d] mt-1 ml-6">{z.description}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Help hint ─── */}
      <div className="absolute bottom-4 left-4 text-[#3a4a5a] text-xs z-10 select-none">
        🖱 Drag to rotate · 🔍 Scroll to zoom · 👆 Click zone
      </div>
    </div>
  )
}
