import React from 'react'
import { ROOMS, RoomConfig } from '../data/zones'
import SpecialistDot from './SpecialistDot'
import { SpecialistData } from '../App'

// ─── Hash for deterministic positioning ──────────────────────────────
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}

export function getPos(name: string, room: RoomConfig) {
  const h = hash(name)
  const pad = 35
  return {
    x: room.x + pad + (h % 97) / 97 * (room.w - 2 * pad),
    y: room.y + pad + 10 + ((h * 41) % 97) / 97 * (room.h - 2 * pad - 20),
  }
}

// ─── Corridor paths ──────────────────────────────────────────────────
const corridors = (
  <>
    <rect x={0} y={400} width={1200} height={20} fill="#0c1119" />
    <rect x={475} y={0} width={15} height={400} fill="#0c1119" />
    <rect x={475} y={420} width={15} height={480} fill="#0c1119" />
  </>
)

// ─── Room patterns ───────────────────────────────────────────────────
function RoomPattern({ room }: { room: RoomConfig }) {
  if (room.id === 'datacenter') {
    return (
      <pattern id={`grid-${room.id}`} width="30" height="20" patternUnits="userSpaceOnUse">
        <rect width="30" height="20" fill="none" />
        <rect x="2" y="2" width="26" height="16" rx="1" fill={room.color} opacity="0.04" />
        <line x1="15" y1="4" x2="15" y2="16" stroke={room.color} opacity="0.06" strokeWidth="0.5" />
      </pattern>
    )
  }
  return (
    <pattern id={`grid-${room.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1" fill={room.color} opacity="0.08" />
      <circle cx="0" cy="0" r="0.5" fill={room.color} opacity="0.04" />
    </pattern>
  )
}

// ─── Desk/Sofa icons ─────────────────────────────────────────────────
function RoomDecor({ room }: { room: RoomConfig }) {
  const { x, y, w, h, color } = room
  const cx = x + w / 2, cy = y + h / 2
  if (room.id === 'datacenter') {
    return (
      <>
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={x + 60 + i * 105} y={y + 80} width="80" height="12" rx="2" fill={color} opacity="0.12" />
        ))}
      </>
    )
  }
  if (room.id === 'oly_office') {
    return (
      <rect x={cx - 50} y={cy - 25} width="100" height="50" rx="3" fill={color} opacity="0.08" stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
    )
  }
  if (room.id === 'ceo_office') {
    return (
      <rect x={cx - 55} y={cy - 30} width="110" height="55" rx="4" fill={color} opacity="0.08" stroke={color} strokeWidth="0.7" strokeOpacity="0.15" />
    )
  }
  if (room.id === 'meeting') {
    return (
      <ellipse cx={cx} cy={cy} rx="140" ry="60" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.12" strokeDasharray="4 4" />
    )
  }
  if (room.id === 'lounge') {
    return (
      <>
        <rect x={x + 60} y={cy - 15} width="120" height="20" rx="10" fill={color} opacity="0.08" />
        <rect x={x + 220} y={cy - 15} width="120" height="20" rx="10" fill={color} opacity="0.06" />
      </>
    )
  }
  if (room.id === 'team_office') {
    return (
      <>
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={x + 80 + i * 150} y={cy - 20} width="100" height="14" rx="2" fill={color} opacity="0.08" />
        ))}
        {[0, 1, 2, 3].map(i => (
          <rect key={`b${i}`} x={x + 80 + i * 150} y={cy + 40} width="100" height="14" rx="2" fill={color} opacity="0.06" />
        ))}
      </>
    )
  }
  return null
}

// ─── FloorPlan ───────────────────────────────────────────────────────
interface Props {
  specialists: SpecialistData[]
  selectedRoom: string | null
  onSelectRoom: (id: string | null) => void
}

export default function FloorPlan({ specialists, selectedRoom, onSelectRoom }: Props) {
  const counts: Record<string, number> = {}
  specialists.forEach(s => {
    const rid = s.roomId || 'lounge'
    counts[rid] = (counts[rid] || 0) + 1
  })

  return (
    <svg viewBox="0 0 1200 900" className="w-full h-full" style={{ background: '#080c14' }}>
      <defs>
        {ROOMS.map(r => <RoomPattern key={r.id} room={r} />)}
        {/* Pulse glow filter */}
        <filter id="pulse">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Corridors */}
      {corridors}

      {/* Rooms */}
      {ROOMS.map(room => {
        const sel = selectedRoom === room.id
        const count = counts[room.id] || 0
        return (
          <g key={room.id} onClick={() => onSelectRoom(sel ? null : room.id)}
            style={{ cursor: 'pointer' }}>
            {/* Room fill */}
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4"
              fill={room.bgColor} stroke={room.color}
              strokeWidth={sel ? 1.5 : 0.5} strokeOpacity={sel ? 0.6 : 0.2} />
            {/* Pattern overlay */}
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4"
              fill={`url(#grid-${room.id})`} />
            {/* Decor */}
            <RoomDecor room={room} />

            {/* Room label */}
            <text x={room.x + 12} y={room.y + 20} fill={room.color}
              fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="11"
              opacity={0.9}>{room.label}</text>
            {/* Icon + counter */}
            <text x={room.x + room.w - 20} y={room.y + 20} fontSize="14"
              textAnchor="end" fill={room.color} opacity={0.7}>{room.icon}</text>
            {count > 0 && (
              <text x={room.x + room.w - 42} y={room.y + 20} fontSize="10"
                textAnchor="end" fill={room.color} opacity={0.5}>{count}</text>
            )}
          </g>
        )
      })}

      {/* Specialists */}
      {specialists.map(spec => (
        <SpecialistDot key={spec.name} spec={spec} />
      ))}
    </svg>
  )
}
