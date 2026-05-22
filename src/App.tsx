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
interface HistoryEvent {
  id?: string
  specialist: string
  event: string
  task?: string
  timestamp?: string
  status?: string
}

interface HistoryResponse { events?: HistoryEvent[] }

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
  { name: 'ceo', emoji: '🧠', status: 'idle', roomId: 'ceo_office', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'oly', emoji: '⚙️', status: 'working', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'builder', emoji: '🛠️', status: 'working', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'sentry', emoji: '🔒', status: 'consulting', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'bulwark', emoji: '🛡️', status: 'working', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'archive', emoji: '📚', status: 'documenting', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'sage', emoji: '📝', status: 'documenting', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'haven', emoji: '💾', status: 'idle', task_label: '', task_runtime: 0, started_at: '' },
  { name: 'ledger', emoji: '⚡', status: 'consulting', task_label: '', task_runtime: 0, started_at: '' },
]

function fmtTimeAgo(ts: string): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── App ────────────────────────────────────────────────────────────
export default function App() {
  const [specialists, setSpecialists] = useState<SpecialistData[]>(DEFAULT_SPECIALISTS)
  const [history, setHistory] = useState<HistoryEvent[]>([])
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
            task_label: s.task_label || s.task || '',
            task_runtime: s.task_runtime || 0,
            started_at: s.started_at ? String(s.started_at) : '',
          }
        })
        const hasCEO = apiSpecs.some((s: SpecialistData) => s.name === 'ceo')
        if (!hasCEO) apiSpecs.unshift({ name: 'ceo', emoji: '🧠', status: 'idle', roomId: 'ceo_office', task_label: '', task_runtime: 0, started_at: '' })
        setSpecialists(apiSpecs)
      }
    } catch { setApiOnline(false) }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-office/history?limit=10')
      if (res.ok) {
        const data: HistoryResponse = await res.json()
        if (data.events) setHistory(data.events)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchActivity()
    fetchHistory()
    const iv = setInterval(() => { fetchActivity(); fetchHistory() }, 5000)
    return () => clearInterval(iv)
  }, [fetchActivity, fetchHistory])

  const mappedSpecialists = specialists.map(s => ({
    ...s,
    roomId: s.roomId || getRoomId(s),
  }))

  const active = mappedSpecialists.filter(s => s.status !== 'idle').length
  const working = mappedSpecialists.filter(s => s.status === 'working').length
  const consulting = mappedSpecialists.filter(s => s.status === 'consulting' || s.status === 'debrief').length
  const documenting = mappedSpecialists.filter(s => s.status === 'documenting').length
  const idle = mappedSpecialists.filter(s => s.status === 'idle').length

  const selectedRoomData = selectedRoom ? ROOMS.find(r => r.id === selectedRoom) : null
  const roomOccupants = selectedRoom
    ? mappedSpecialists.filter(s => s.roomId === selectedRoom)
    : []

  // Phase counts for status bar
  const phases = [
    { id: 'consulting', label: 'Consulting', icon: '🤝', color: '#a855f7', count: consulting },
    { id: 'working', label: 'Working', icon: '⚙️', color: '#22c55e', count: working },
    { id: 'debrief', label: 'Debrief', icon: '📋', color: '#f59e0b', count: consulting },
    { id: 'documenting', label: 'Docs', icon: '📝', color: '#06b6d4', count: documenting },
    { id: 'idle', label: 'Idle', icon: '☕', color: '#64748b', count: idle },
  ]

  return (
    <div className="w-screen h-screen bg-[#080c14] relative overflow-hidden font-sans flex flex-col">
      {/* ─── Floor Plan ─── */}
      <div className="flex-1 relative">
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
          <span className="text-[#8899aa] text-xs">v1.1.0</span>
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

        {/* ─── Panels ─── */}
        {panel !== 'none' && (
          <div className="absolute top-12 right-3 w-64 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-h-[calc(100vh-180px)] overflow-y-auto">
            {panel === 'crew' && (
              <>
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
              </>
            )}
            {panel === 'rooms' && (
              <>
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
                          {count > 0 && <span className="ml-auto text-[#6c7a8d]">{count}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Room Detail Overlay ─── */}
        {selectedRoomData && (
          <div className="absolute bottom-32 left-4 bg-[#0d1117]/95 backdrop-blur border border-[#1a2235] rounded-lg p-3 z-10 max-w-xs">
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
        <div className="absolute bottom-28 left-4 text-[#3a4a5a] text-xs z-10 select-none pointer-events-none">
          Click rooms for details
        </div>
      </div>

      {/* ─── Activity Bar ── Bottom status strip ───────────────────── */}
      <div className="h-24 bg-[#0a0f18] border-t border-[#1a2235] flex gap-0 z-20">
        {/* Phase indicators */}
        <div className="flex items-center gap-1 px-4 border-r border-[#1a2235] min-w-[420px]">
          {phases.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-3 py-2 rounded-md"
              style={{ backgroundColor: p.count > 0 ? `${p.color}15` : 'transparent' }}>
              <span className="text-sm">{p.icon}</span>
              <span className="text-xs font-medium" style={{ color: p.color }}>{p.label}</span>
              <span className="text-xs font-bold ml-0.5" style={{ color: p.color }}>{p.count}</span>
            </div>
          ))}
        </div>

        {/* Working agents — what they're doing */}
        <div className="flex-1 flex items-center gap-3 px-4 overflow-x-auto">
          {mappedSpecialists.filter(s => s.status !== 'idle' && s.status !== 'consulting').map(s => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[s.status] || '#64748b', filter: s.status === 'working' ? 'url(#pulse)' : undefined }} />
              <span>{s.emoji || '👤'}</span>
              <span className="text-[#c8d0e0] font-medium">{s.name}</span>
              {s.task_label ? (
                <span className="text-[#667788] max-w-[200px] truncate">{s.task_label}</span>
              ) : (
                <span className="text-[#445566] italic">{STATUS_LABELS[s.status] || s.status}</span>
              )}
            </div>
          ))}
          {mappedSpecialists.filter(s => s.status !== 'idle' && s.status !== 'consulting').length === 0 && (
            <span className="text-[#3a4a5a] text-xs italic">No active tasks</span>
          )}
        </div>

        {/* Recent history */}
        <div className="flex items-center gap-2 px-4 border-l border-[#1a2235] min-w-[280px] max-w-[320px] overflow-hidden">
          <span className="text-[#556677] text-xs flex-shrink-0">📜 Recent:</span>
          <div className="text-xs text-[#667788] truncate">
            {history.length > 0 ? (
              history.slice(0, 1).map((e, i) => (
                <span key={i} className="truncate">
                  <span style={{ color: STATUS_COLORS[e.status || 'idle'] || '#64748b' }}>{e.specialist || '?'}</span>
                  {' '}{e.event || e.task || ''}
                  {e.timestamp && <span className="text-[#445566] ml-2">{fmtTimeAgo(e.timestamp)}</span>}
                </span>
              ))
            ) : (
              <span className="text-[#3a4a5a] italic">Waiting for events...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
