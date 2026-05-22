import React, { useState, useEffect, useCallback, useRef } from 'react'
import FloorPlan3D from './components/FloorPlan3D'
import { ZoneConfig, ZONES, STATUS_LABELS, SPECIALIST_EMOJIS } from './data/zones'

// ─── Types ────────────────────────────────────────────────────────────
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

interface ActivityEvent {
  timestamp: string
  specialist: string
  event: string
  details?: string
}

interface ZoneCounts {
  zones: number
  racks: number
  switches: number
  agents: number
}

const APP_VERSION = 'v0.8.0'
const API_POLL_INTERVAL = 5000 // 5 seconds

// ─── Map Backend zone names → Frontend zone IDs ───────────────────────
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

// ─── Map Backend specialist names (capitalized) → Frontend keys ───────
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

// ─── Default Specialists — shown when API unavailable ─────────────────
const DEFAULT_SPECIALISTS: SpecialistData[] = [
  { name: 'oly', emoji: '⚙️', status: 'idle' },
  { name: 'builder', emoji: '📦', status: 'working' },
  { name: 'sentry', emoji: '🌐', status: 'consulting' },
  { name: 'bulwark', emoji: '🖥️', status: 'working' },
  { name: 'archive', emoji: '💾', status: 'documenting' },
  { name: 'sage', emoji: '🧠', status: 'debrief' },
  { name: 'haven', emoji: '🏠', status: 'idle' },
  { name: 'ledger', emoji: '🏦', status: 'consulting' },
]

function mapApiSpecialists(apiSpecialists: any[]): SpecialistData[] {
  return apiSpecialists.map((s: any) => {
    const rawName = s.name || s.id || ''
    const frontendName = BACKEND_NAME_MAP[rawName] || rawName.toLowerCase()
    const rawZone = s.zone || ''
    const frontendZone = rawZone.startsWith('consult:')
      ? 'meeting'
      : (BACKEND_ZONE_MAP[rawZone] || rawZone)
    return {
      name: frontendName,
      status: s.status || 'idle',
      phase: s.phase || s.status || 'idle',
      task_label: s.task_label || undefined,
      task_runtime: s.task_runtime || undefined,
      started_at: s.started_at ? String(s.started_at) : undefined,
      zone: frontendZone || undefined,
      emoji: s.emoji || undefined,
    }
  })
}

// ─── Counts ───────────────────────────────────────────────────────────
function computeCounts(specialists: SpecialistData[], apiConnected: boolean): ZoneCounts {
  return {
    zones: ZONES.length,
    racks: 8,
    switches: 7,
    agents: specialists.length,
  }
}

// ─── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [selectedZone, setSelectedZone] = useState<ZoneConfig | null>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [hoveredSpecialist, setHoveredSpecialist] = useState<SpecialistData | null>(null)
  const [specialists, setSpecialists] = useState<SpecialistData[]>(DEFAULT_SPECIALISTS)
  const [apiConnected, setApiConnected] = useState(false)
  const [activityHistory, setActivityHistory] = useState<ActivityEvent[]>([])
  const [panelsCollapsed, setPanelsCollapsed] = useState(false)
  const [showCrewPanel, setShowCrewPanel] = useState(true)
  const [showActivityPanel, setShowActivityPanel] = useState(false)
  const counts = computeCounts(specialists, apiConnected)

  // ─── API Polling ──────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-office/activity')
      if (res.ok) {
        const data = await res.json()
        if (data.specialists?.length) {
          setSpecialists(mapApiSpecialists(data.specialists))
          setApiConnected(true)
        }
      }
    } catch {
      // API unreachable — keep using current/default specialists
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-office/history?limit=15')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setActivityHistory(data)
        }
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchActivity()
    fetchHistory()
    const interval = setInterval(() => {
      fetchActivity()
      fetchHistory()
    }, API_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchActivity, fetchHistory])

  // ─── UI Handlers ──────────────────────────────────────────────────
  const handleSelectZone = (zone: ZoneConfig | null) => {
    setSelectedZone(zone)
  }

  const specialistsInZone = selectedZone
    ? specialists.filter(s => {
        // Check if specialist maps to this zone
        if (s.zone === selectedZone.id) return true
        return false
      })
    : []

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#040811] text-[#c8d0e0]">
      {/* ═══════════════════════════════════════════════════════════════
          TOP BAR
          ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#080c18]/95 border-b border-[#1a3355]/50 backdrop-blur-sm shrink-0">
        {/* Left: branding */}
        <div className="flex items-center gap-3">
          <span className="text-[#39bae6] font-bold text-sm">⚙️ VF</span>
          <span className="text-xs text-[#6c7a8d] hidden sm:inline">3D Visual Office</span>
          <span className="text-[#1a3355] hidden sm:inline">|</span>
          <span className="text-[10px] text-[#39bae6]/70 hidden sm:inline">{APP_VERSION}</span>
        </div>

        {/* Center: counts */}
        <div className="flex items-center gap-3 text-[10px] text-[#8899bb]">
          <span>🏢 {counts.zones} Zones</span>
          <span className="text-[#1a3355]">|</span>
          <span>🖥️ {counts.racks} Racks</span>
          <span className="text-[#1a3355]">|</span>
          <span>🌐 {counts.switches} Switches</span>
          <span className="text-[#1a3355]">|</span>
          <span>👤 {counts.agents} Agents</span>
        </div>

        {/* Right: status + panel toggles */}
        <div className="flex items-center gap-2">
          {/* API status dot */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              apiConnected
                ? 'bg-[#22c55e] shadow-[0_0_6px_#22c55e]'
                : 'bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]'
            }`} />
            <span className="text-[#6c7a8d] hidden sm:inline">
              {apiConnected ? 'API Connected' : 'Standalone'}
            </span>
          </div>

          {/* Panel toggles */}
          <button
            onClick={() => setShowCrewPanel(!showCrewPanel)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              showCrewPanel ? 'bg-[#1a3355] text-[#39bae6]' : 'bg-transparent text-[#556688] hover:text-[#8899bb]'
            }`}
            title="Crew Status"
          >
            👥 Crew
          </button>
          <button
            onClick={() => setShowActivityPanel(!showActivityPanel)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              showActivityPanel ? 'bg-[#1a3355] text-[#39bae6]' : 'bg-transparent text-[#556688] hover:text-[#8899bb]'
            }`}
            title="Activity Log"
          >
            📋 Activity
          </button>
          <button
            onClick={() => setPanelsCollapsed(!panelsCollapsed)}
            className="px-2 py-0.5 rounded text-[10px] text-[#556688] hover:text-[#8899bb] transition-colors"
            title={panelsCollapsed ? 'Show Panels' : 'Hide Panels'}
          >
            {panelsCollapsed ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT — 3D Canvas + Side Panels
          ════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <FloorPlan3D
            selectedZone={selectedZone}
            onSelectZone={handleSelectZone}
            hoveredZone={hoveredZone}
            onHoverZone={setHoveredZone}
            specialists={specialists}
            onHoverSpecialist={setHoveredSpecialist}
            hoveredSpecialist={hoveredSpecialist}
          />

          {/* Hover hint */}
          {hoveredZone && !selectedZone && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="px-3 py-1.5 rounded-md bg-[#080c18]/95 border border-[#00ccff]/30 text-xs text-[#c8d0e0]">
                Click for zone details
              </div>
            </div>
          )}

          {/* Controls hint */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <div className="text-[10px] text-[#556688]/60 space-y-0.5 text-right">
              <div>🖱 Drag to rotate</div>
              <div>🔍 Scroll to zoom</div>
              <div>👆 Click zone for info</div>
            </div>
          </div>

          {/* Selected zone info panel */}
          {selectedZone && (
            <div className="absolute bottom-4 left-4 z-20 animate-fade-in max-w-xs">
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'rgba(6, 10, 20, 0.94)',
                  border: `1px solid ${selectedZone.color}44`,
                  boxShadow: `0 0 25px ${selectedZone.color}22`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedZone.icon}</span>
                    <h3 className="text-sm font-bold" style={{ color: selectedZone.color }}>
                      {selectedZone.label}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedZone(null)}
                    className="text-[#556688] hover:text-[#8899cc] text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-[#8899bb] leading-relaxed mb-2">
                  {selectedZone.description}
                </p>
                {specialistsInZone.length > 0 && (
                  <div className="pt-2 border-t border-[#1a3355]/40">
                    <div className="text-[10px] text-[#556688] mb-1">Specialists in zone:</div>
                    <div className="flex flex-wrap gap-1">
                      {specialistsInZone.map(s => (
                        <span
                          key={s.name}
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {s.emoji || '👤'} {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SIDE PANELS (collapsible)
            ════════════════════════════════════════════════════════ */}
        {!panelsCollapsed && (
          <div className="w-72 bg-[#080c18]/95 border-l border-[#1a3355]/40 flex flex-col overflow-hidden shrink-0">
            {/* Crew Status Panel */}
            {showCrewPanel && (
              <div className={`flex-1 overflow-y-auto ${showActivityPanel ? 'max-h-[50%]' : 'max-h-full'} border-b border-[#1a3355]/30`}>
                <div className="sticky top-0 bg-[#080c18] px-3 py-2 border-b border-[#1a3355]/20">
                  <h3 className="text-xs font-bold text-[#8899bb]">👥 Crew Status</h3>
                </div>
                <div className="p-2 space-y-1">
                  {specialists.map((spec) => {
                    const statusColor = {
                      working: '#22c55e',
                      consulting: '#a855f7',
                      debrief: '#f59e0b',
                      documenting: '#06b6d4',
                      idle: '#64748b',
                    }[spec.status || 'idle'] || '#64748b'

                    const emoji = spec.emoji || SPECIALIST_EMOJIS[spec.name] || '👤'
                    const runtime = spec.task_runtime || 0
                    const runtimeStr = runtime > 0
                      ? runtime < 60 ? `${Math.floor(runtime)}s`
                      : runtime < 3600 ? `${Math.floor(runtime / 60)}m`
                      : `${Math.floor(runtime / 3600)}h`
                      : ''

                    return (
                      <div
                        key={spec.name}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0d1525]/60 transition-colors text-[11px]"
                      >
                        {/* Status dot */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: statusColor,
                            boxShadow: `0 0 4px ${statusColor}`,
                          }}
                        />
                        {/* Emoji */}
                        <span className="text-sm">{emoji}</span>
                        {/* Name + Task */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[#c8d0e0] font-medium truncate">
                            {spec.name.charAt(0).toUpperCase() + spec.name.slice(1)}
                          </div>
                          {spec.task_label && (
                            <div className="text-[#556688] truncate text-[10px]">
                              {spec.task_label}
                            </div>
                          )}
                        </div>
                        {/* Runtime */}
                        {runtimeStr && (
                          <span className="text-[#556688] text-[10px] shrink-0">
                            ⏱{runtimeStr}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Activity Panel */}
            {showActivityPanel && (
              <div className="flex-1 overflow-y-auto">
                <div className="sticky top-0 bg-[#080c18] px-3 py-2 border-b border-[#1a3355]/20">
                  <h3 className="text-xs font-bold text-[#8899bb]">📋 Recent Activity</h3>
                </div>
                <div className="p-2 space-y-1">
                  {activityHistory.length === 0 ? (
                    <div className="text-[10px] text-[#556688] px-2 py-4 text-center">
                      No recent activity
                    </div>
                  ) : (
                    activityHistory.map((event, i) => (
                      <div
                        key={i}
                        className="px-2 py-1.5 rounded hover:bg-[#0d1525]/60 transition-colors text-[10px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#556688] shrink-0">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[#8899bb] font-medium">{event.specialist}</span>
                        </div>
                        <div className="text-[#c8d0e0] mt-0.5">{event.event}</div>
                        {event.details && (
                          <div className="text-[#556688] truncate">{event.details}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
