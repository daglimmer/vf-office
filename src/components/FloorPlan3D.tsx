import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ZONES, ZoneConfig } from '../data/zones'
import { SpecialistData } from '../App'
import SpecialistAvatar from './SpecialistAvatar'

const GRID = 12
const GRID_ROWS = 8
const CELL = 1.5
const FW = GRID * CELL // 18
const FD = GRID_ROWS * CELL // 12

// ─── Zone floor colors ──────────────────────────────────────────────
const ZONE_COLORS: Record<string, string> = {
  server_room: '#2299dd', patch_room: '#dd8833', vault: '#aa9966',
  lounge: '#c4a882', datacenter: '#00aacc', oly_office: '#5599bb',
  meeting: '#5566aa', the_office: '#6677aa',
}

// ─── Status → zone routing ──────────────────────────────────────────
export function resolveZone(spec: SpecialistData): string | null {
  if (spec.zone) return spec.zone
  switch (spec.status) {
    case 'consulting': case 'debrief': return 'meeting'
    case 'idle': return 'lounge'
    case 'documenting': return 'the_office'
    default: return null
  }
}

// ─── Floor grid ─────────────────────────────────────────────────────
function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[FW + 2, FD + 2]} />
        <meshStandardMaterial color="#080c14" roughness={0.5} metalness={0.3} />
      </mesh>
      <gridHelper
        args={[Math.max(FW, FD) + 1, Math.max(GRID, GRID_ROWS), '#111822', '#0d1117']}
        position={[0, 0.001, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[FW, FD]} />
        <meshStandardMaterial color="#0a0e17" roughness={0.2} metalness={0.15} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ─── Zone block (clickable floor plate) ─────────────────────────────
function ZonePlate({ zone, selected, hovered, onSelect, onHover }: {
  zone: ZoneConfig; selected: boolean; hovered: boolean;
  onSelect: (z: ZoneConfig | null) => void; onHover: (id: string | null) => void;
}) {
  const { col, row, colSpan, rowSpan } = zone
  const w = colSpan * CELL
  const d = rowSpan * CELL
  const x = col * CELL + w / 2 - FW / 2
  const z = -(row * CELL + d / 2 - FD / 2)

  const color = ZONE_COLORS[zone.id] || '#445566'
  const opacity = selected ? 0.35 : hovered ? 0.22 : 0.08
  const emissiveIntensity = selected ? 0.5 : hovered ? 0.3 : 0.05

  return (
    <group>
      <mesh
        position={[x, 0.005, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : zone) }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(zone.id) }}
        onPointerOut={() => onHover(null)}
      >
        <planeGeometry args={[w * 0.9, d * 0.9]} />
        <meshStandardMaterial
          color={color}
          transparent opacity={opacity}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Zone border frame */}
      <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(w, d) * 0.42, Math.max(w, d) * 0.44, 4]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.6 : 0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─── Glass partition ────────────────────────────────────────────────
function GlassWall({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  const isHorizontal = w > d
  return (
    <mesh position={[x, 0.2, z]}>
      <boxGeometry args={isHorizontal ? [w, 0.4, 0.03] : [0.03, 0.4, d]} />
      <meshPhysicalMaterial
        color="#1a2a4a" roughness={0.1} metalness={0.05}
        transparent opacity={0.2} envMapIntensity={0.3}
        emissive={color} emissiveIntensity={0.05}
      />
    </mesh>
  )
}

// ─── Scene lights ───────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} color="#1a1c28" />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#ccddff" distance={20} />
      <pointLight position={[-5, 5, -3]} intensity={0.4} color="#2299dd" distance={12} />
      <pointLight position={[5, 5, 3]} intensity={0.4} color="#dd8833" distance={12} />
      <pointLight position={[-5, 5, 3]} intensity={0.3} color="#00aacc" distance={10} />
      <pointLight position={[5, 5, -3]} intensity={0.3} color="#aabbcc" distance={10} />
    </>
  )
}

// ─── FloorPlan3D ────────────────────────────────────────────────────
interface Props {
  selectedZone: ZoneConfig | null
  onSelectZone: (z: ZoneConfig | null) => void
  hoveredZone: string | null
  onHoverZone: (id: string | null) => void
  specialists: SpecialistData[]
}

export default function FloorPlan3D({ selectedZone, onSelectZone, hoveredZone, onHoverZone, specialists }: Props) {
  // Glass wall positions
  const walls = useMemo(() => [
    // Horizontal walls (row dividers)
    { x: 0, z: -(2 * CELL - FD / 2), w: FW, d: 0.1, color: '#ff6600' },
    { x: 0, z: -(5 * CELL - FD / 2), w: FW, d: 0.1, color: '#00ff88' },
    // Vertical walls (between zones)
    { x: 2 * CELL - FW / 2, z: -((0 + 2) / 2 * CELL - FD / 2), w: 0.1, d: 2 * CELL, color: '#ff0044' },
    { x: 8 * CELL - FW / 2, z: -((0 + 4) / 2 * CELL - FD / 2), w: 0.1, d: 4 * CELL, color: '#ff00ff' },
  ], [])

  return (
    <Canvas
      className="w-full h-full"
      camera={{ position: [0, 8, 6], fov: 45, near: 0.1, far: 80 }}
      gl={{ toneMapping: THREE.ReinhardToneMapping, antialias: true }}
      shadows
    >
      <color attach="background" args={['#080c14']} />
      <fog attach="fog" args={['#080c14', 20, 60]} />

      <Lights />
      <Floor />

      {/* Zones */}
      {ZONES.map(z => (
        <ZonePlate
          key={z.id}
          zone={z}
          selected={selectedZone?.id === z.id}
          hovered={hoveredZone === z.id}
          onSelect={onSelectZone}
          onHover={onHoverZone}
        />
      ))}

      {/* Glass walls */}
      {walls.map((w, i) => (
        <GlassWall key={i} {...w} />
      ))}

      {/* Corner ambient pillars */}
      {[[-FW / 2, -FD / 2], [FW / 2, -FD / 2], [-FW / 2, FD / 2], [FW / 2, FD / 2]].map(([cx, cz], i) => (
        <mesh key={`p-${i}`} position={[cx, 0.15, cz]} castShadow>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#1a2040" emissive="#00aacc" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Specialists */}
      {specialists.map(s => {
        const zoneId = s.zone ?? resolveZone(s)
        const zone = ZONES.find(z => z.id === zoneId)
        if (!zone) return null
        return (
          <Suspense key={s.name} fallback={null}>
            <SpecialistAvatar spec={s} zone={zone} />
          </Suspense>
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}
