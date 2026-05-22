import React from 'react'
import { ROOMS, RoomConfig } from '../data/zones'
import SpecialistDot from './SpecialistDot'
import { SpecialistData } from '../App'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}

export function getPos(name: string, room: RoomConfig) {
  const h = hash(name)
  const pad = 40
  return {
    x: room.x + pad + (h % 97) / 97 * (room.w - 2 * pad),
    y: room.y + pad + 10 + ((h * 41) % 97) / 97 * (room.h - 2 * pad - 20),
  }
}

// ─── Corridors ──────────────────────────────────────────────────────
const corridors = (
  <>
    <rect x={0} y={400} width={1200} height={20} fill="#0c1119" />
    <rect x={475} y={0} width={15} height={400} fill="#0c1119" />
    <rect x={475} y={420} width={15} height={480} fill="#0c1119" />
  </>
)

// ─── Room patterns ──────────────────────────────────────────────────
function RoomPattern({ room }: { room: RoomConfig }) {
  if (room.id === 'datacenter') {
    return (
      <pattern id={`grid-${room.id}`} width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="none" />
        <rect x="2" y="2" width="36" height="16" rx="1" fill={room.color} opacity="0.03" />
        <line x1="20" y1="3" x2="20" y2="17" stroke={room.color} opacity="0.04" strokeWidth="0.5" />
      </pattern>
    )
  }
  return (
    <pattern id={`grid-${room.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="0.8" fill={room.color} opacity="0.06" />
      <circle cx="0" cy="0" r="0.5" fill={room.color} opacity="0.03" />
    </pattern>
  )
}

// ─── Blinking LED ───────────────────────────────────────────────────
function BlinkLED({ cx, cy, color, delay }: { cx: number; cy: number; color: string; delay: number }) {
  return (
    <circle cx={cx} cy={cy} r="1.5" fill={color} opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.1;0.9" dur={`${1.5 + delay * 0.3}s`} repeatCount="indefinite" begin={`${delay * 0.2}s`} />
    </circle>
  )
}

// ─── Furniture ──────────────────────────────────────────────────────
function Furniture({ room }: { room: RoomConfig }) {
  const { x, y, w, h, color } = room
  const cx = x + w / 2
  const cy = y + h / 2

  switch (room.id) {
    // ── DATA CENTER: 3 server racks with blinking LEDs ──────────────
    case 'datacenter': {
      const racks = [
        { rx: x + 60, ry: y + 60 },
        { rx: x + 170, ry: y + 60 },
        { rx: x + 280, ry: y + 60 },
      ]
      return (
        <>
          {racks.map((r, ri) => (
            <g key={ri}>
              {/* Rack body */}
              <rect x={r.rx} y={r.ry} width="80" height="100" rx="3" fill="#0d1520" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
              {/* Rack label */}
              <text x={r.rx + 40} y={r.ry - 6} textAnchor="middle" fontSize="7" fill={color} opacity="0.5">
                RACK {ri + 1}
              </text>
              {/* Server slots */}
              {Array.from({ length: 8 }).map((_, si) => (
                <rect key={si} x={r.rx + 8} y={r.ry + 8 + si * 11} width="64" height="8" rx="1" fill={color} opacity="0.08" />
              ))}
              {/* Blinking LEDs */}
              {Array.from({ length: 6 }).map((_, li) => (
                <BlinkLED key={li} cx={r.rx + 14 + li * 10} cy={r.ry + 94} color={li % 3 === 0 ? '#22c55e' : li % 3 === 1 ? '#2299dd' : '#f59e0b'} delay={li + ri * 2} />
              ))}
              {/* Vent lines */}
              {[0, 1, 2].map(vi => (
                <line key={vi} x1={r.rx + 14} y1={r.ry + 90} x2={r.rx + 66} y2={r.ry + 90 - vi * 1.5} stroke={color} strokeWidth="0.3" opacity="0.15" />
              ))}
            </g>
          ))}
          {/* Floor cable tray */}
          <line x1={x + 50} y1={y + 165} x2={x + 380} y2={y + 165} stroke={color} strokeWidth="1.5" opacity="0.1" strokeDasharray="3 3" />
        </>
      )
    }

    // ── OLY'S OFFICE: desk + dual monitors ──────────────────────────
    case 'oly_office':
      return (
        <>
          {/* Desk */}
          <rect x={cx - 65} y={cy - 22} width="130" height="44" rx="4" fill="#0d1520" stroke={color} strokeWidth="0.6" strokeOpacity="0.25" />
          {/* Monitors */}
          <rect x={cx - 35} y={cy - 14} width="30" height="22" rx="2" fill="#0a1218" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
          <rect x={cx + 5} y={cy - 14} width="30" height="22" rx="2" fill="#0a1218" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
          {/* Screen glow */}
          <rect x={cx - 33} y={cy - 12} width="26" height="18" rx="1" fill={color} opacity="0.07" />
          <rect x={cx + 7} y={cy - 12} width="26" height="18" rx="1" fill={color} opacity="0.05" />
          {/* Chair */}
          <ellipse cx={cx} cy={cy + 24} rx="16" ry="8" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
          {/* Keyboard */}
          <rect x={cx - 25} y={cy + 3} width="50" height="8" rx="2" fill={color} opacity="0.06" />
          {/* Coffee cup */}
          <circle cx={cx + 50} cy={cy - 10} r="4" fill="none" stroke="#c4a882" strokeWidth="0.5" opacity="0.4" />
        </>
      )

    // ── CEO OFFICE: large desk + chair ──────────────────────────────
    case 'ceo_office':
      return (
        <>
          {/* Large desk */}
          <rect x={cx - 70} y={cy - 30} width="140" height="55" rx="5" fill="#0d1520" stroke={color} strokeWidth="0.7" strokeOpacity="0.3" />
          {/* Monitor */}
          <rect x={cx - 20} y={cy - 22} width="40" height="28" rx="2" fill="#0a1218" stroke={color} strokeWidth="0.5" strokeOpacity="0.35" />
          <rect x={cx - 18} y={cy - 20} width="36" height="24" rx="1" fill={color} opacity="0.06" />
          {/* Executive chair */}
          <ellipse cx={cx} cy={cy + 32} rx="20" ry="10" fill="none" stroke={color} strokeWidth="0.7" strokeOpacity="0.25" />
          <line x1={cx} y1={cy + 32} x2={cx} y2={cy + 42} stroke={color} strokeWidth="0.4" opacity="0.15" />
          {/* Desk items */}
          <rect x={cx + 30} y={cy - 12} width="25" height="18" rx="1" fill={color} opacity="0.04" />
          <rect x={cx + 45} y={cy - 5} width="12" height="8" rx="1" fill="#22c55e" opacity="0.08" />
          <circle cx={cx - 45} cy={cy - 10} r="3.5" fill="none" stroke="#c4a882" strokeWidth="0.5" opacity="0.4" />
        </>
      )

    // ── LOUNGE: two sofas + coffee table ────────────────────────────
    case 'lounge':
      return (
        <>
          {/* Left sofa */}
          <rect x={x + 50} y={cy - 18} width="140" height="24" rx="12" fill="#1a1410" stroke={color} strokeWidth="0.5" strokeOpacity="0.25" />
          <rect x={x + 58} y={cy - 12} width="124" height="12" rx="6" fill={color} opacity="0.05" />
          {/* Right sofa */}
          <rect x={x + 240} y={cy - 18} width="140" height="24" rx="12" fill="#1a1410" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
          <rect x={x + 248} y={cy - 12} width="124" height="12" rx="6" fill={color} opacity="0.04" />
          {/* Coffee table */}
          <rect x={cx - 35} y={cy + 15} width="70" height="30" rx="3" fill="#1a1410" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
          {/* Table items */}
          <circle cx={cx - 10} cy={cy + 24} r="4" fill="none" stroke={color} strokeWidth="0.4" opacity="0.25" />
          <circle cx={cx + 12} cy={cy + 24} r="3" fill="none" stroke={color} strokeWidth="0.4" opacity="0.2" />
          {/* Rug */}
          <rect x={cx - 80} y={cy - 30} width="160" height="90" rx="8" fill="none" stroke={color} strokeWidth="0.3" strokeOpacity="0.1" />
        </>
      )

    // ── MEETING ROOM: oval table + 8 chairs ─────────────────────────
    case 'meeting':
      return (
        <>
          {/* Oval table */}
          <ellipse cx={cx} cy={cy} rx="160" ry="55" fill="#1a1420" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
          <ellipse cx={cx} cy={cy} rx="150" ry="48" fill={color} opacity="0.03" />
          {/* Chairs around table */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
            const cxx = cx + Math.cos(angle) * 68
            const cyy = cy + Math.sin(angle) * 38
            return (
              <g key={i}>
                <ellipse cx={cxx} cy={cyy} rx="10" ry="7" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
                <line x1={cxx} y1={cyy - 7} x2={cxx} y2={cyy + 7} stroke={color} strokeWidth="0.3" opacity="0.1" />
              </g>
            )
          })}
          {/* Big widescreen display on wall */}
          <rect x={x + 40} y={y + 10} width={w - 80} height="12" rx="2" fill="#0a0a18" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
          <rect x={x + 44} y={y + 12} width={w - 88} height="8" rx="1" fill={color} opacity="0.12" />
          <text x={cx} y={y + 8} textAnchor="middle" fontSize="7" fill={color} opacity="0.4" fontWeight="bold">PRESENTATION DISPLAY</text>
        </>
      )

    // ── TEAM OFFICE: 3×6 desk grid with widescreen monitors ──────────
    case 'team_office': {
      const cols = 6, rows = 3
      const cellW = (w - 80) / cols
      const cellH = (h - 40) / rows
      return (
        <>
          {Array.from({ length: rows }).map((_, ri) =>
            Array.from({ length: cols }).map((__, ci) => {
              const dx = x + 40 + cellW * ci + cellW / 2
              const dy = y + 25 + cellH * ri + cellH / 2
              return (
                <g key={`${ri}-${ci}`}>
                  {/* Desk */}
                  <rect x={dx - 28} y={dy - 12} width="56" height="24" rx="2" fill="#0d111a" stroke={color} strokeWidth="0.4" strokeOpacity="0.18" />
                  {/* Widescreen monitor */}
                  <rect x={dx - 20} y={dy - 10} width="40" height="12" rx="1.5" fill="#0a0e18" stroke={color} strokeWidth="0.3" strokeOpacity="0.25" />
                  <rect x={dx - 18} y={dy - 8} width="36" height="8" rx="1" fill={color} opacity="0.05" />
                  {/* Keyboard */}
                  <rect x={dx - 18} y={dy + 2} width="36" height="5" rx="1" fill={color} opacity="0.04" />
                </g>
              )
            })
          )}
        </>
      )
    }

    default:
      return null
  }
}

// ─── FloorPlan ──────────────────────────────────────────────────────
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
    <svg viewBox="-50 -50 1300 1000" preserveAspectRatio="xMidYMid meet" className="w-full h-full" style={{ background: '#080c14' }}>
      <defs>
        {ROOMS.map(r => <RoomPattern key={r.id} room={r} />)}
        <filter id="pulse">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {corridors}

      {ROOMS.map(room => {
        const sel = selectedRoom === room.id
        const count = counts[room.id] || 0
        return (
          <g key={room.id} onClick={() => onSelectRoom(sel ? null : room.id)} style={{ cursor: 'pointer' }}>
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4"
              fill={room.bgColor} stroke={room.color}
              strokeWidth={sel ? 1.5 : 0.5} strokeOpacity={sel ? 0.6 : 0.2} />
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4"
              fill={`url(#grid-${room.id})`} />
            <Furniture room={room} />
            <text x={room.x + 14} y={room.y + 22} fill={room.color}
              fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="12"
              opacity={0.9}>{room.label}</text>
            <text x={room.x + room.w - 22} y={room.y + 22} fontSize="15"
              textAnchor="end" fill={room.color} opacity={0.7}>{room.icon}</text>
            {count > 0 && (
              <text x={room.x + room.w - 46} y={room.y + 22} fontSize="10"
                textAnchor="end" fill={room.color} opacity={0.5}>{count}</text>
            )}
          </g>
        )
      })}

      {specialists.map(spec => (
        <SpecialistDot key={spec.name} spec={spec} />
      ))}
    </svg>
  )
}
