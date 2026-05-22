import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { SpecialistData } from '../App'
import { ZONES, ZoneConfig, STATUS_COLORS, STATUS_LABELS, SPECIALIST_ZONES, STATUS_ZONE_MAP, SPECIALIST_COLORS, SPECIALIST_EMOJIS } from '../data/zones'

const GRID_COLS = 12
const GRID_ROWS = 8
const CELL = 1.5

// ─── Utility: hash specialist name for deterministic offset ─────────
function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function formatRuntime(seconds: number): string {
  if (!seconds || seconds < 0) return ''
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

// ─── Resolve zone for a specialist ──────────────────────────────────
export function resolveZoneId(spec: SpecialistData): string | null {
  // Priority: status→zone map > API zone > specialist default zone
  if (spec.status && STATUS_ZONE_MAP[spec.status]) {
    return STATUS_ZONE_MAP[spec.status]
  }
  if (spec.zone) return spec.zone
  return SPECIALIST_ZONES[spec.name] || null
}

// ─── SpecialistAvatar Component ─────────────────────────────────────
interface SpecialistAvatarProps {
  spec: SpecialistData
  zone: ZoneConfig
  onHover: (spec: SpecialistData | null) => void
}

export default function SpecialistAvatar({ spec, zone, onHover }: SpecialistAvatarProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const currentPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const needsInit = useRef(true)
  const bobAccum = useRef(Math.random() * Math.PI * 2)
  const [hovered, setHovered] = useState(false)
  const [runtime, setRuntime] = useState(0)

  const cellW = (GRID_COLS * CELL) / GRID_COLS
  const cellD = (GRID_ROWS * CELL) / GRID_ROWS
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL

  // Deterministic hash-based offset within zone
  const seed = useMemo(() => hashName(spec.name), [spec.name])
  const offsetX = ((seed % 100) / 100 - 0.5) * zone.colSpan * cellW * 0.55
  const offsetZ = (((seed * 37) % 100) / 100 - 0.5) * zone.rowSpan * cellD * 0.55

  const x = zone.col * cellW + (zone.colSpan * cellW) / 2 - fw / 2 + offsetX
  const z = -(zone.row * cellD + (zone.rowSpan * cellD) / 2 - fd / 2) + offsetZ

  // Compute initial runtime from API data
  const initialRuntime = useMemo(() => {
    if (spec.task_runtime && spec.task_runtime > 0) return spec.task_runtime
    if (spec.started_at) {
      const started = new Date(spec.started_at).getTime()
      return Math.max(0, Math.floor((Date.now() - started) / 1000))
    }
    return 0
  }, [spec.task_runtime, spec.started_at])

  // Runtime counter
  useEffect(() => {
    const isWorking = spec.status === 'working' || spec.status === 'consulting'
    setRuntime(initialRuntime)
    if (!isWorking || initialRuntime <= 0) return
    const interval = setInterval(() => setRuntime(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [initialRuntime, spec.status])

  // Update target position
  useEffect(() => {
    targetPos.current.set(x, 0, z)
    if (needsInit.current) {
      currentPos.current.set(x, 0, z)
      needsInit.current = false
    }
  }, [x, z])

  const phaseStatus = spec.status || 'idle'
  const statusColor = STATUS_COLORS[phaseStatus] || STATUS_COLORS.idle
  const statusLabel = STATUS_LABELS[phaseStatus] || phaseStatus
  const defaultColor = SPECIALIST_COLORS[spec.name] || '#6b7280'
  const emoji = spec.emoji || SPECIALIST_EMOJIS[spec.name] || '👤'

  const isWorking = spec.status === 'working'
  const isActive = spec.status !== 'idle'
  const taskLabel = spec.task_label || spec.task || ''
  const runtimeStr = runtime > 0 ? formatRuntime(runtime) : ''
  const displayName = spec.name.charAt(0).toUpperCase() + spec.name.slice(1)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Smooth LERP movement
    const lerpSpeed = 2.0
    currentPos.current.lerp(targetPos.current, Math.min(1, delta * lerpSpeed))
    groupRef.current.position.x = currentPos.current.x
    groupRef.current.position.z = currentPos.current.z

    // Bounce animation
    bobAccum.current += delta * (isWorking ? 2.8 : isActive ? 2.2 : 1.0)
    const baseY = 0.85
    const amplitude = isWorking ? 0.06 : isActive ? 0.04 : 0.02
    groupRef.current.position.y = baseY + Math.sin(bobAccum.current) * amplitude
  })

  const radius = 0.18

  return (
    <group ref={groupRef} position={[x, 0.85, z]}>
      {/* ─── Hover trigger (invisible larger sphere) ─── */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(spec) }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); onHover(null) }}
      >
        <sphereGeometry args={[radius * 2.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ─── Outer glow shell ─── */}
      <mesh>
        <sphereGeometry args={[radius * 1.25, 24, 24]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={isActive ? 0.10 : 0.03}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Main sphere ─── */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={isActive ? statusColor : defaultColor}
          roughness={0.12}
          metalness={0.08}
          emissive={isActive ? statusColor : defaultColor}
          emissiveIntensity={isActive ? (isWorking ? 1.0 : 0.6) : 0.08}
        />
      </mesh>

      {/* ─── Wireframe cage (angular geometric shell) ─── */}
      <mesh>
        <sphereGeometry args={[radius * 1.05, 8, 6]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={isWorking ? 0.45 : isActive ? 0.25 : 0.06}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Holographic base ring ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[radius * 1.1, radius * 1.3, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={isActive ? 0.50 : 0.10}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Orbital ring ─── */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]} position={[0, radius * 0.5, 0]}>
        <torusGeometry args={[radius * 1.15, 0.015, 8, 24]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isWorking ? 1.2 : isActive ? 0.6 : 0.08}
          roughness={0.08}
          metalness={0.08}
        />
      </mesh>

      {/* ─── Phase indicator dot below ─── */}
      <mesh position={[0, -(radius + 0.06), 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isActive ? 0.9 : 0.12}
          roughness={0.05}
        />
      </mesh>

      {/* ─── Emoji label above ─── */}
      <Text
        position={[0, radius + 0.22, 0]}
        fontSize={0.18}
        anchorX="center"
        anchorY="bottom"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.012}
        outlineColor="#040811"
        color={isActive ? '#ffffff' : '#8899bb'}
      >
        {emoji}
      </Text>

      {/* ─── Name label ─── */}
      <Text
        position={[0, -(radius + 0.18), 0]}
        fontSize={0.10}
        anchorX="center"
        anchorY="top"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.01}
        outlineColor="#040811"
        color={isActive ? '#e0e8f8' : '#7788aa'}
        fontWeight="bold"
      >
        {displayName}
      </Text>

      {/* ─── Status label ─── */}
      <Text
        position={[0, radius + 0.40, 0]}
        fontSize={0.09}
        anchorX="center"
        anchorY="bottom"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.009}
        outlineColor="#040811"
        color={statusColor}
      >
        {statusLabel}
      </Text>

      {/* ─── Task label ─── */}
      {taskLabel && (
        <Text
          position={[0, radius + 0.54, 0]}
          fontSize={0.07}
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.006}
          outlineColor="#040811"
          color="#8899bb"
          maxWidth={2.0}
        >
          {taskLabel}
        </Text>
      )}

      {/* ─── Runtime counter ─── */}
      {runtimeStr && (
        <Text
          position={[0, radius + (taskLabel ? 0.66 : 0.54), 0]}
          fontSize={0.065}
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.006}
          outlineColor="#040811"
          color="#8899bb"
        >
          ⏱ {runtimeStr}
        </Text>
      )}

      {/* ─── Hover tooltip (HTML overlay) ─── */}
      {hovered && (
        <Html center position={[0, radius + 0.90, 0]} distanceFactor={8}>
          <div
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
            style={{
              backgroundColor: 'rgba(8, 12, 24, 0.96)',
              border: `1px solid ${statusColor}66`,
              boxShadow: `0 0 16px ${statusColor}33`,
              backdropFilter: 'blur(8px)',
              color: '#c8d0e0',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span>{emoji}</span>
              <span className="font-bold" style={{ color: statusColor }}>{displayName}</span>
            </div>
            <div className="space-y-0.5 text-[#8899bb]">
              <div>Status: <span style={{ color: statusColor }}>{statusLabel}</span></div>
              <div>Zone: {zone.label}</div>
              {taskLabel && <div>Task: {taskLabel}</div>}
              {runtimeStr && <div>Runtime: {runtimeStr}</div>}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
