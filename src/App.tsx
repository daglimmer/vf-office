import React, { useState, useEffect, useCallback } from 'react'
import FloorPlan from './components/FloorPlan'
import { ROOMS, STATUS_COLORS, STATUS_LABELS, getRoomId } from './data/zones'

// ─── Types ──────────────────────────────────────────────────────────
export interface SpecialistData {
  name: string
  status: string
  roomId?: string
  emoji?: string
  task_label?: string
  task_runtime?: number
  started_at?: string
}

interface ActivityResponse { specialists: SpecialistData[] }

const ZONE_MAP: Record<string, string> = {
  desk: 'team_office', data_center: 'datacenter', meeting: 'meeting',
  lounge: 'lounge', server_room: 'datacenter', patch_room: 'datacenter',
  vault: 'datacenter', oly_office: 'oly_office',
}
const NAME_MAP: Record<string, string> = {
  Builder: 'builder', Sentry: 'sentry', Archive: 'archive',
  Bulwark: 'bulwark', Sage: 'sage', Haven: 'haven',
  Ledger: 'ledger', Oly: 'oly', CEO: 'ceo',
}

const DEFAULT_SPECIALISTS: SpecialistData[] = [
  { name: 'ceo', emoji: '🧠', status: 'idle', roomId: 'ceo_office' },
  { name: 'oly', emoji: '⚙️', status: 'working' },
  { name: 'builder', emoji: '🛠️', status: 'working' },
  { name: 'sentry', emoji: '🔒', status: 'consulting' },
  { name: 'bulwark', emoji: '🛡️', status: 'working' },
  { name: 'archive', emoji: '📚', status: 'documenting' },
  { name: 'sage', emoji: '📝', status: 'documenting' },
  { name: 'haven', emoji: '💾', status: 'idle' },
  { name: 'ledger', emoji: '⚡', status: 'consulting' },
]

// ─── App ────────────────────────────────────────────────────────────
export default function App() {
  const [specialists, setSpecialists] = useState<SpecialistData[]>(DEFAULT_SPECIALISTS)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [panel, setPanel] = useState<'none' | 'crew' | 'rooms'>('none')
  const [apiOnline, setApiOnline] = useState(false)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-office/activity')
      if (!res.ok) throw new Error('API down')
      const data: ActivityResponse = await res.json()
      setApiOnline(true)
      if (data.specialists?.length) {
        const apiSpecs = data.specialists.map((s: any) => {
          const rawName = s.name || s.id || ''
          const rawZone = s.zone || ''
          return {
            name: NAME_MAP[rawName] || rawName.toLowerCase(),
            status: s.status || 'idle',
            roomId: rawZone.startsWith('consult:') ? 'meeting' : (ZONE_MAP[rawZone] || undefined),
            emoji: s.emoji,
            task_label: s.task_label || s.task,
            task_runtime: s.task_runtime,
            started_at: s.started_at ? String(s.started_at) : undefined,
          }
        })
        // CEO always present, even if not in API
        const hasCEO = apiSpecs.some((s: SpecialistData) => s.name === 'ceo')
        if (!hasCEO) apiSpecs.unshift({ name: 'ceo', emoji: '🧠', status: 'idle', roomId: 'ceo_office', task_label: '', task_runtime: 0, started_at: '' })
        setSpecialists(apiSpecs)
      }
    } catch { setApiOnline(false) }
  }, [])

  useEffect(() => {
    fetchActivity()
    const iv = setInterval(fetchActivity, 5000)
    return () => clearInterval(iv)
  }, [fetchActivity])

  // Derive roomId for each specialist if not set by API
  const mappedSpecialists = specialists.map(s => ({
    ...s,
    roomId: s.roomId || getRoomId(s),
  }))

  const active = mappedSpecialists.filter(s => s.status !== 'idle').length
  const working = mappedSpecialists.filter(s => s.status === 'working').length

  const selectedRoomData = selectedRoom ? ROOMS.find(r => r.id === selectedRoom) : null
  const roomOccupants = selectedRoom
    ? mappedSpecialists.filter(s => s.roomId === selectedRoom)
    : []

  return (
    <div className="w-screen h-screen bg-[#080c14] relative overflow-hidden font-sans">
      {/* ─── Floor Plan ─── */}
      <FloorPlan
        specialists={mappedSpecialists}
        selectedRoom={selectedRoom}
        onSelectRoom={setSelectedRoom}
      />

      {/* ─── Top Bar ─── */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-[#0d1117]/90 backdrop-blur border-b border-[#1a2235] flex items-center px-4 gap-4 z-10">
        <span className="text-[#39bae6] font-bold text-sm">⚙️ VF</span>
        <span className="text-[#6c7a8d] text-xs">2D Office</span>
        <span className="text-[#6c7a8d] text-xs">|</span>
        <span className="text-[#8899aa] text-xs">v1.0.0</span>
        <div className="flex-1" />
        <span className="text-[#8899aa] text-xs">
          🏢 {ROOMS.length} Rooms · 👤 {mappedSpecialists.length} Agents
        </span>
        <span className={`text-xs ${apiOnline ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {apiOnline ? '● Live' : '○ Offline'}
        </span>
        <button onClick={() => setPanel(p => p === 'crew' ? 'none' : 'crew')}
          className={`text-xs px-2 py-1 rounded ${panel === 'crew' ? 'bg-[#1a3355] text-[#39bae6]' : 'text-[#6c7a8d] hover:text-[#8899aa]'}`}>
          👥 Crew
        </button>
        <button onClick={() => setPanel(p => p === 'rooms' ? 'none' : 'rooms')}
          className={`text-xs px-2 py-1 rounded ${panel === 'rooms' ? 'bg-[#1a3355] text-[#39bae6]' : 'text-[#6c7a8d] hover:text-[#8899aa]'}`}>
          📋 Rooms
        </button>
      </div>

      {/* ─── Crew Panel ─── */}
      {panel === 'crew' && (
        <div className="absolute top-12 right-3 w-64 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-h-[calc(100vh-80px)] overflow-y-auto animate-fade-in">
          <h3 className="text-[#e0e8f0] font-semibold text-sm mb-2">
            👥 Crew ({active} active · {working} working)
          </h3>
          <div className="space-y-1">
            {mappedSpecialists.map(s => (
              <div key={s.name} className="flex items-center gap-2 text-xs py-1 border-b border-[#1a2235]/50">
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s.status] || STATUS_COLORS.idle }} />
                <span>{s.emoji || '👤'}</span>
                <span className="text-[#c8d0e0] capitalize font-medium w-16">{s.name}</span>
                <span className="text-[#6c7a8d] flex-1 truncate">{STATUS_LABELS[s.status] || s.status}</span>
                {s.task_label && <span className="text-[#556677] truncate max-w-[100px]" title={s.task_label}>{s.task_label}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Rooms Panel ─── */}
      {panel === 'rooms' && (
        <div className="absolute top-12 right-3 w-64 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-h-[calc(100vh-80px)] overflow-y-auto animate-fade-in">
          <h3 className="text-[#e0e8f0] font-semibold text-sm mb-2">📋 Rooms</h3>
          <div className="space-y-2">
            {ROOMS.map(r => {
              const count = mappedSpecialists.filter(s => s.roomId === r.id).length
              return (
                <button key={r.id}
                  onClick={() => { setSelectedRoom(selectedRoom === r.id ? null : r.id); setPanel('none') }}
                  className={`w-full text-left p-2 rounded text-xs transition ${
                    selectedRoom === r.id ? 'bg-[#1a3355] border border-[#39bae6]/30' : 'hover:bg-[#111a28] border border-transparent'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span className="text-[#c8d0e0] font-medium">{r.label}</span>
                    {count > 0 && <span className="ml-auto text-[#6c7a8d]">{count} agent{count !== 1 ? 's' : ''}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Room Detail Overlay ─── */}
      {selectedRoomData && (
        <div className="absolute bottom-12 left-4 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-w-xs animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span>{selectedRoomData.icon}</span>
            <span className="text-[#e0e8f0] font-semibold text-sm">{selectedRoomData.label}</span>
          </div>
          <p className="text-[#6c7a8d] text-xs mb-2">{selectedRoomData.description}</p>
          {roomOccupants.length > 0 ? (
            <div className="space-y-1">
              {roomOccupants.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#64748b' }} />
                  <span>{s.emoji || '👤'}</span>
                  <span className="text-[#c8d0e0]">{s.name}</span>
                  <span className="text-[#6c7a8d]">{STATUS_LABELS[s.status] || s.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#556677] text-xs italic">No agents here</p>
          )}
        </div>
      )}

      {/* ─── Hint ─── */}
      <div className="absolute bottom-4 left-4 text-[#3a4a5a] text-xs z-10 select-none pointer-events-none">
        Click rooms for details
      </div>
    </div>
  )
}
