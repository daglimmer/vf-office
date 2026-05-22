import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { ROOMS, STATUS_COLORS, STATUS_LABELS, getRoomId } from '../data/zones'
import { getPos } from './FloorPlan'
import { SpecialistData } from '../App'

function fmtTime(secs: number): string {
  if (!secs || secs < 0) return ''
  if (secs < 60) return `${Math.floor(secs)}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}

export default function SpecialistDot({ spec }: { spec: SpecialistData }) {
  const gRef = useRef<SVGGElement>(null)
  const [hovered, setHovered] = useState(false)
  const [animating, setAnimating] = useState(false)

  const roomId = spec.roomId || getRoomId(spec)
  const room = ROOMS.find(r => r.id === roomId) || ROOMS.find(r => r.id === 'lounge')!
  const pos = getPos(spec.name, room)
  const status = spec.status || 'idle'
  const color = STATUS_COLORS[status] || STATUS_COLORS.idle
  const isActive = status !== 'idle'
  const isWorking = status === 'working'
  const emoji = spec.emoji || '👤'
  const name = spec.name.charAt(0).toUpperCase() + spec.name.slice(1)
  const runtime = spec.task_runtime ? fmtTime(spec.task_runtime) : ''

  // FLIP animation: when position changes, snap back, then transition
  const prevPos = useRef({ x: pos.x, y: pos.y })
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const prev = prevPos.current
    const dx = prev.x - pos.x
    const dy = prev.y - pos.y
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      // Position changed — set inverse offset and start animation
      setOffset({ x: dx, y: dy })
      setAnimating(true)
      // Force browser to render the inverted position, then animate back
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOffset({ x: 0, y: 0 })
          setTimeout(() => setAnimating(false), 800)
        })
      })
    }
    prevPos.current = { x: pos.x, y: pos.y }
  }, [pos.x, pos.y])

  const tx = pos.x + offset.x
  const ty = pos.y + offset.y
  const transition = animating ? 'transform 0.8s ease-in-out' : 'none'

  return (
    <g
      ref={gRef}
      style={{ transition, transform: `translate(${tx}px, ${ty}px)` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow ring */}
      <circle r={isActive ? 16 : 13} fill="none" stroke={color}
        strokeWidth={isActive ? 2 : 1} opacity={isActive ? 0.25 : 0.1}
        className={isWorking ? 'animate-pulse-glow' : ''} />

      {/* Main dot */}
      <circle r={isActive ? 10 : 8} fill={color}
        opacity={isActive ? 0.95 : 0.5}
        filter={isWorking ? 'url(#pulse)' : undefined} />

      {/* Emoji above */}
      <text y={-16} textAnchor="middle" fontSize="12" fill="#e0e8f0">{emoji}</text>

      {/* Name below */}
      <text y={20} textAnchor="middle" fontSize="8" fill={isActive ? '#c8d0e0' : '#556677'}>{name}</text>

      {/* Status tag */}
      <text y={30} textAnchor="middle" fontSize="7" fill={color}>
        {STATUS_LABELS[status] || status}
      </text>

      {/* Runtime */}
      {runtime && (
        <text y={40} textAnchor="middle" fontSize="6" fill="#556677">⏱ {runtime}</text>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <g>
          <rect x={-55} y={-52} width={110} height={56} rx="4"
            fill="#080c14" fillOpacity="0.96" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
          <text y={-34} textAnchor="middle" fontSize="7" fill={color} fontWeight="bold">{emoji} {name}</text>
          <text y={-23} textAnchor="middle" fontSize="6" fill="#8899bb">
            {STATUS_LABELS[status] || status} · {room.label}
          </text>
          {spec.task_label && (
            <text y={-12} textAnchor="middle" fontSize="6" fill="#667788">{spec.task_label}</text>
          )}
          {runtime && (
            <text y={-1} textAnchor="middle" fontSize="6" fill="#556677">Runtime: {runtime}</text>
          )}
        </g>
      )}
    </g>
  )
}
