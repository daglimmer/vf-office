import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { SpecialistData } from '../App'
import { ZoneConfig } from '../data/zones'

const CELL = 1.5
const FW = 12 * CELL
const FD = 8 * CELL

// ─── Colors ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  working: '#22c55e',
  consulting: '#a855f7',
  debrief: '#f59e0b',
  documenting: '#06b6d4',
  idle: '#4a5568',
}

const STATUS_LABELS: Record<string, string> = {
  working: 'Working',
  consulting: 'Consulting',
  debrief: 'Debrief',
  documenting: 'Documenting',
  idle: 'Idle',
}

const SPEC_EMOJIS: Record<string, string> = {
  oly: '🧠', builder: '🛠️', sentry: '🔒', bulwark: '🛡️',
  archive: '📚', sage: '📝', haven: '💾', ledger: '⚡',
}

// ─── Helpers ────────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}

function fmtTime(secs: number): string {
  if (!secs || secs < 0) return ''
  if (secs < 60) return `${Math.floor(secs)}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}

// ─── SpecialistAvatar ───────────────────────────────────────────────
export default function SpecialistAvatar({ spec, zone }: { spec: SpecialistData; zone: ZoneConfig }) {
  const groupRef = useRef<THREE.Group>(null!)
  const currentPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const bobT = useRef(Math.random() * Math.PI * 2)
  const [hovered, setHovered] = useState(false)
  const [runtime, setRuntime] = useState(0)

  // Position: zone center + deterministic hash offset
  const pos = useMemo(() => {
    const seed = hash(spec.name)
    const ox = ((seed % 100) / 100 - 0.5) * zone.colSpan * CELL * 0.5
    const oz = (((seed * 37) % 100) / 100 - 0.5) * zone.rowSpan * CELL * 0.5
    return {
      x: zone.col * CELL + (zone.colSpan * CELL) / 2 - FW / 2 + ox,
      z: -(zone.row * CELL + (zone.rowSpan * CELL) / 2 - FD / 2) + oz,
    }
  }, [spec.name, zone.col, zone.row, zone.colSpan, zone.rowSpan])

  // Runtime from API
  const initialRt = useMemo(() => {
    if (spec.task_runtime && spec.task_runtime > 0) return spec.task_runtime
    if (spec.started_at) return Math.max(0, Math.floor((Date.now() - new Date(spec.started_at).getTime()) / 1000))
    return 0
  }, [spec.task_runtime, spec.started_at])

  useEffect(() => {
    setRuntime(initialRt)
    if (spec.status !== 'working' || initialRt <= 0) return
    const iv = setInterval(() => setRuntime(p => p + 1), 1000)
    return () => clearInterval(iv)
  }, [initialRt, spec.status])

  // Update target on zone change
  useEffect(() => {
    targetPos.current.set(pos.x, 0, pos.z)
    if (!currentPos.current.lengthSq()) currentPos.current.set(pos.x, 0, pos.z)
  }, [pos.x, pos.z])

  const status = spec.status || 'idle'
  const color = STATUS_COLORS[status] || STATUS_COLORS.idle
  const label = STATUS_LABELS[status] || status
  const emoji = spec.emoji || SPEC_EMOJIS[spec.name] || '👤'
  const displayName = spec.name.charAt(0).toUpperCase() + spec.name.slice(1)
  const task = spec.task_label || (spec as any).task || ''
  const isWorking = status === 'working'
  const isActive = status !== 'idle'
  const rtStr = runtime > 0 ? fmtTime(runtime) : ''

  // Animation: lerp + bounce
  useFrame((_, delta) => {
    if (!groupRef.current) return
    currentPos.current.lerp(targetPos.current, Math.min(1, delta * 2.5))
    groupRef.current.position.x = currentPos.current.x
    groupRef.current.position.z = currentPos.current.z

    bobT.current += delta * (isWorking ? 3 : isActive ? 2.2 : 1)
    const amp = isWorking ? 0.06 : isActive ? 0.04 : 0.02
    groupRef.current.position.y = 0.8 + Math.sin(bobT.current) * amp
  })

  const R = 0.2

  return (
    <group ref={groupRef} position={[pos.x, 0.8, pos.z]}>
      {/* Hover target (invisible) */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[R * 2.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[R * 1.3, 24, 24]} />
        <meshBasicMaterial
          color={color} transparent
          opacity={isActive ? 0.12 : 0.03}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Main sphere */}
      <mesh castShadow>
        <sphereGeometry args={[R, 28, 28]} />
        <meshStandardMaterial
          color={color} roughness={0.1} metalness={0.05}
          emissive={color}
          emissiveIntensity={isActive ? (isWorking ? 1 : 0.6) : 0.06}
        />
      </mesh>

      {/* Wireframe shell */}
      <mesh>
        <sphereGeometry args={[R * 1.06, 6, 6]} />
        <meshBasicMaterial
          color={color} wireframe transparent
          opacity={isWorking ? 0.4 : isActive ? 0.2 : 0.05}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Ring at base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[R * 1.1, R * 1.35, 32]} />
        <meshBasicMaterial
          color={color} transparent
          opacity={isActive ? 0.5 : 0.08}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Phase dot */}
      <mesh position={[0, -(R + 0.06), 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1 : 0.1} roughness={0.05} />
      </mesh>

      {/* Labels */}
      <Text position={[0, R + 0.25, 0]} fontSize={0.18} anchorX="center" anchorY="bottom"
        font="/fonts/Inter-Bold.ttf" outlineWidth={0.01} outlineColor="#040811"
        color={isActive ? '#fff' : '#8899bb'}
      >
        {emoji}
      </Text>

      <Text position={[0, -(R + 0.16), 0]} fontSize={0.09} anchorX="center" anchorY="top"
        font="/fonts/Inter-Bold.ttf" outlineWidth={0.008} outlineColor="#040811"
        color={isActive ? '#e0e8f8' : '#7788aa'}
      >
        {displayName}
      </Text>

      <Text position={[0, R + 0.43, 0]} fontSize={0.08} anchorX="center" anchorY="bottom"
        font="/fonts/Inter-Bold.ttf" outlineWidth={0.007} outlineColor="#040811"
        color={color}
      >
        {label}
      </Text>

      {task && (
        <Text position={[0, R + 0.54, 0]} fontSize={0.065} anchorX="center" anchorY="bottom"
          font="/fonts/Inter-Bold.ttf" outlineWidth={0.006} outlineColor="#040811"
          color="#8899bb" maxWidth={2.5}
        >
          {task}
        </Text>
      )}

      {rtStr && (
        <Text position={[0, R + (task ? 0.65 : 0.54), 0]} fontSize={0.06} anchorX="center" anchorY="bottom"
          font="/fonts/Inter-Bold.ttf" outlineWidth={0.005} outlineColor="#040811"
          color="#8899bb"
        >
          ⏱ {rtStr}
        </Text>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html center position={[0, R + 0.9, 0]} distanceFactor={8}>
          <div
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
            style={{
              backgroundColor: 'rgba(8,12,24,0.96)',
              border: `1px solid ${color}66`,
              boxShadow: `0 0 16px ${color}33`,
              backdropFilter: 'blur(8px)',
              color: '#c8d0e0',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span>{emoji}</span>
              <span className="font-bold" style={{ color }}>{displayName}</span>
            </div>
            <div className="space-y-0.5 text-[#8899bb]">
              <div>Status: <span style={{ color }}>{label}</span></div>
              <div>Zone: {zone.label}</div>
              {task && <div>Task: {task}</div>}
              {rtStr && <div>Runtime: {rtStr}</div>}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
