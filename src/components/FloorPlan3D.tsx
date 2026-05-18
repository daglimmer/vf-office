import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Environment, Text } from '@react-three/drei'
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import ZoneBlock from './ZoneBlock'
import { ServerRacks } from './RackBlock'
import OfficeFurniture from './OfficeFurniture'
import PatchRoomFurniture from './PatchRoomFurniture'
import VaultFurniture from './VaultFurniture'
import MeetingFurniture from './MeetingFurniture'
import TheOfficeFurniture from './TheOfficeFurniture'
import LoungeFurniture from './LoungeFurniture'
import CorridorDecor from './CorridorDecor'
import DataCentrePortal from './DataCentrePortal'
import { ZONES, ZoneConfig, WORKFLOW_PHASES } from '../data/zones'
import { SpecialistData } from '../App'

const GRID_COLS = 12
const GRID_ROWS = 8

interface FloorPlanProps {
  selectedZone: ZoneConfig | null
  onSelectZone: (zone: ZoneConfig | null) => void
  hoveredZone: string | null
  onHoverZone: (id: string | null) => void
  specialists?: SpecialistData[]
  activePhase?: string
}

function Floor({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5

  return (
    <group>
      {/* Clean white floor — light, polished */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[floorWidth + 2, floorDepth + 2]} />
        <meshStandardMaterial
          color="#f0f0f4"
          roughness={0.30}
          metalness={0.15}
        />
      </mesh>
      {/* Subtle light grid lines */}
      <gridHelper
        args={[Math.max(floorWidth, floorDepth) + 0.5, Math.max(gridCols, gridRows), '#d0d0d8', '#e8e8ec']}
        position={[0, 0.001, 0]}
      />
      {/* Light reflective sheen overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial
          color="#f5f5f8"
          roughness={0.20}
          metalness={0.10}
          transparent
          opacity={0.45}
        />
      </mesh>
    </group>
  )
}

function Walls({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const fw = gridCols * 1.5
  const fd = gridRows * 1.5
  const hw = fw / 2 + 0.5
  const hd = fd / 2 + 0.5
  const wallHeight = 0.35

  return (
    <group>
      {/* Back wall (north) */}
      <mesh position={[0, wallHeight / 2, -hd]} receiveShadow>
        <boxGeometry args={[fw + 1, wallHeight, 0.06]} />
        <meshStandardMaterial color="#e8e8ec" roughness={0.45} metalness={0.10} />
      </mesh>
      {/* Front wall (south) */}
      <mesh position={[0, wallHeight / 2, hd]} receiveShadow>
        <boxGeometry args={[fw + 1, wallHeight, 0.06]} />
        <meshStandardMaterial color="#e8e8ec" roughness={0.45} metalness={0.10} />
      </mesh>
      {/* Left wall (west) */}
      <mesh position={[-hw, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[0.06, wallHeight, fd + 1]} />
        <meshStandardMaterial color="#e8e8ec" roughness={0.45} metalness={0.10} />
      </mesh>
      {/* Right wall (east) */}
      <mesh position={[hw, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[0.06, wallHeight, fd + 1]} />
        <meshStandardMaterial color="#e8e8ec" roughness={0.45} metalness={0.10} />
      </mesh>

      {/* Subtle accent strips at wall tops — clean bright */}
      {[
        { pos: [0, wallHeight + 0.005, -hd], args: [fw + 1, 0.015, 0.015] },
        { pos: [0, wallHeight + 0.005, hd], args: [fw + 1, 0.015, 0.015] },
        { pos: [-hw, wallHeight + 0.005, 0], args: [0.015, 0.015, fd + 1] },
        { pos: [hw, wallHeight + 0.005, 0], args: [0.015, 0.015, fd + 1] },
      ].map((s, i) => (
        <mesh key={`nstrip-${i}`} position={s.pos as [number, number, number]}>
          <boxGeometry args={s.args as [number, number, number]} />
          <meshStandardMaterial color="#d0d0d8" emissive="#d0d0d8" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function Lights() {
  return (
    <>
      {/* Low warm ambient — deep purple/blue base so the neons pop */}
      <ambientLight intensity={0.35} color="#1a0a2a" />

      {/* Overhead neon point lights — grid of cyberpunk ceiling fixtures */}
      <pointLight position={[0, 7, 0]} intensity={1.5} color="#00aaff" distance={12} />
      <pointLight position={[-4, 6, -3]} intensity={1.0} color="#8844ff" distance={10} />
      <pointLight position={[4, 6, 3]} intensity={1.0} color="#00ccff" distance={10} />
      <pointLight position={[-4, 6, 3]} intensity={0.8} color="#ff0066" distance={9} />
      <pointLight position={[4, 6, -3]} intensity={0.8} color="#00ff88" distance={9} />

      {/* Ground-level neon glow pools — under each zone */}
      <pointLight position={[-6.75, 0.5, 3.0]} intensity={0.8} color="#ff0044" distance={4} />   {/* Server Room */}
      <pointLight position={[-3, 0.5, 3.75]} intensity={0.7} color="#ff6600" distance={3} />    {/* Patch Room */}
      <pointLight position={[1.5, 0.5, 3.75]} intensity={0.7} color="#ffaa00" distance={3} />    {/* Vault */}
      <pointLight position={[5.25, 0.5, 2.25]} intensity={0.8} color="#ff00ff" distance={4} />   {/* Lounge */}
      <pointLight position={[-6.75, 0.5, -4.5]} intensity={0.8} color="#00ff88" distance={4} />   {/* Data Centre */}
      <pointLight position={[-5.25, 0.5, -3.75]} intensity={0.7} color="#00ccff" distance={3} />  {/* Oly's Office */}
      <pointLight position={[-1.5, 0.5, -3.75]} intensity={0.7} color="#4488ff" distance={4} />   {/* Meeting Room */}
      <pointLight position={[3.75, 0.5, -3.75]} intensity={0.7} color="#8844ff" distance={4} />   {/* The Office */}

      {/* Corridor overhead neon tubes */}
      <pointLight position={[0, 2.5, 0]} intensity={0.6} color="#00aaff" distance={6} />
    </>
  )
}

// ─── Zone Divider Walls — Ray's Grid Layout ────────────────────────
const DIVIDER_HEIGHT = 0.35
const DIVIDER_THICKNESS = 0.08

function ZoneWalls({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const cellW = (gridCols * 1.5) / gridCols
  const cellD = (gridRows * 1.5) / gridRows
  const fw = gridCols * 1.5
  const fd = gridRows * 1.5

  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const hWall = (x1: number, x2: number, z: number, length: number, color: string) => ({
    x: (x1 + x2) / 2, z, length: length || Math.abs(x2 - x1), color, isH: true,
  })

  const vWall = (x: number, z1: number, z2: number, color: string) => ({
    x, z: (z1 + z2) / 2, length: Math.abs(z2 - z1) || fd, color, isH: false,
  })

  const walls = [
    // ─── Vertical walls ───
    // col 2: Server↔Patch (rows 0-2), DC↔Oly (rows 5-8)
    vWall(colX(2), rowZ(0), rowZ(2), '#ff0044'),
    vWall(colX(2), rowZ(5), rowZ(8), '#00ff88'),
    // col 5: Patch↔Vault (rows 0-2)
    vWall(colX(5), rowZ(0), rowZ(2), '#ff6600'),
    // col 4: Oly↔Meeting (rows 5-8)
    vWall(colX(4), rowZ(5), rowZ(8), '#00ccff'),
    // col 7: Meeting↔The Office (rows 5-8)
    vWall(colX(7), rowZ(5), rowZ(8), '#4488ff'),
    // col 8: Vault↔Lounge (rows 0-4)
    vWall(colX(8), rowZ(0), rowZ(4), '#ff00ff'),
    // col 10: Lounge↔empty & The Office↔empty (full height accent)
    vWall(colX(10), rowZ(0), rowZ(8), '#8844ff'),

    // ─── Horizontal walls ───
    // row 2: Patch/Vault bottom → corridor (cols 2-8)
    hWall(colX(2), colX(8), rowZ(2), 6 * cellW, '#ff6600'),
    // row 3: Server bottom (cols 0-2)
    hWall(colX(0), colX(2), rowZ(3), 2 * cellW, '#ff0044'),
    // row 4: Lounge bottom (cols 8-10)
    hWall(colX(8), colX(10), rowZ(4), 2 * cellW, '#ff00ff'),
    // row 5: Corridor → DC/Oly/Meeting/The Office (cols 0-10)
    hWall(colX(0), colX(10), rowZ(5), 10 * cellW, '#00ff88'),
  ]

  return (
    <group>
      {walls.map((w, i) => (
        <mesh
          key={`divider-${i}`}
          position={[w.x, DIVIDER_HEIGHT / 2, w.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[
            w.isH ? w.length : DIVIDER_THICKNESS,
            DIVIDER_HEIGHT,
            w.isH ? DIVIDER_THICKNESS : w.length,
          ]} />
          <meshStandardMaterial
            color="#e8e8ec"
            roughness={0.40}
            metalness={0.10}
            emissive={w.color}
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Glass Walls — transparent panes atop solid dividers ─────────────
const GLASS_HEIGHT = 0.65
const GLASS_THICKNESS = 0.02

function GlassWalls({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const cellW = (gridCols * 1.5) / gridCols
  const cellD = (gridRows * 1.5) / gridRows
  const fw = gridCols * 1.5
  const fd = gridRows * 1.5

  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const hGlass = (x1: number, x2: number, z: number, length: number, color: string) => ({
    x: (x1 + x2) / 2, z, length: length || Math.abs(x2 - x1), color, isH: true,
  })
  const vGlass = (x: number, z1: number, z2: number, color: string) => ({
    x, z: (z1 + z2) / 2, length: Math.abs(z2 - z1) || fd, color, isH: false,
  })

  const glassPanels = [
    // ─── Vertical glass panels ───
    vGlass(colX(2), rowZ(0), rowZ(2), '#ff0044'),
    vGlass(colX(2), rowZ(5), rowZ(8), '#00ff88'),
    vGlass(colX(5), rowZ(0), rowZ(2), '#ff6600'),
    vGlass(colX(4), rowZ(5), rowZ(8), '#00ccff'),
    vGlass(colX(7), rowZ(5), rowZ(8), '#4488ff'),
    vGlass(colX(8), rowZ(0), rowZ(4), '#ff00ff'),
    vGlass(colX(10), rowZ(0), rowZ(8), '#8844ff'),
    // ─── Horizontal glass panels ───
    hGlass(colX(2), colX(8), rowZ(2), 6 * cellW, '#ff6600'),
    hGlass(colX(0), colX(2), rowZ(3), 2 * cellW, '#ff0044'),
    hGlass(colX(8), colX(10), rowZ(4), 2 * cellW, '#ff00ff'),
    hGlass(colX(0), colX(10), rowZ(5), 10 * cellW, '#00ff88'),
  ]

  const glassY = DIVIDER_HEIGHT + GLASS_HEIGHT / 2

  return (
    <group>
      {glassPanels.map((g, i) => (
        <mesh
          key={`glass-${i}`}
          position={[g.x, glassY, g.z]}
          castShadow
        >
          <boxGeometry args={[
            g.isH ? g.length : GLASS_THICKNESS,
            GLASS_HEIGHT,
            g.isH ? GLASS_THICKNESS : g.length,
          ]} />
          <meshPhysicalMaterial
            color="#1a2a4a"
            metalness={0.08}
            roughness={0.06}
            transparent
            opacity={0.28}
            envMapIntensity={0.5}
            clearcoat={0.15}
            clearcoatRoughness={0.15}
            emissive={g.color}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Glass Doors — at each room entrance ────────────────────────────
const DOOR_WIDTH = 0.4
const DOOR_FRAME_THICKNESS = 0.015

function GlassDoors({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const cellW = (gridCols * 1.5) / gridCols
  const cellD = (gridRows * 1.5) / gridRows
  const fw = gridCols * 1.5
  const fd = gridRows * 1.5

  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const flatDoors = [
    // Server Room → corridor (centered on cols 0-2, row 3 boundary)
    { x: (colX(0) + colX(2)) / 2, z: rowZ(3), rot: 0, color: '#ff0044', label: 'SR' },
    // Patch Room → corridor (centered on cols 2-4, row 2 boundary)  
    { x: (colX(2) + colX(4)) / 2, z: rowZ(2), rot: 0, color: '#ff6600', label: 'PR' },
    // Vault → corridor (centered on cols 5-7, row 2 boundary)
    { x: (colX(5) + colX(7)) / 2, z: rowZ(2), rot: 0, color: '#ffaa00', label: 'VT' },
    // Lounge → corridor (centered on cols 8-9, row 4 boundary)
    { x: (colX(8) + colX(10)) / 2, z: rowZ(4), rot: 0, color: '#ff00ff', label: 'LO' },
    // Data Centre → corridor (centered on cols 0-1, row 5 boundary)
    { x: (colX(0) + colX(2)) / 2, z: rowZ(5), rot: 0, color: '#00ff88', label: 'DC' },
    // Oly's Office → corridor (centered on cols 2-3, row 5 boundary)
    { x: (colX(2) + colX(4)) / 2, z: rowZ(5), rot: 0, color: '#00ccff', label: 'OO' },
    // Meeting Room → corridor (centered on cols 4-6, row 5 boundary)
    { x: (colX(4) + colX(7)) / 2, z: rowZ(5), rot: 0, color: '#4488ff', label: 'MR' },
    // The Office → corridor (centered on cols 7-9, row 5 boundary)
    { x: (colX(7) + colX(10)) / 2, z: rowZ(5), rot: 0, color: '#8844ff', label: 'TO' },
  ]

  const doorBaseY = 0.01
  const doorTopY = DIVIDER_HEIGHT + GLASS_HEIGHT
  const doorH = doorTopY - doorBaseY
  const doorZ = DIVIDER_THICKNESS / 2 + 0.02
  const hingeX = DOOR_WIDTH / 2 - DOOR_FRAME_THICKNESS / 2

  return (
    <group>
      {flatDoors.map((d, i) => (
        <group key={`door-${i}`} position={[d.x, doorBaseY, d.z]} rotation={[0, d.rot, 0]}>
          {/* Door frame — two vertical posts */}
          {[-hingeX, hingeX].map((fx, j) => (
            <mesh key={`post-${j}`} position={[fx, doorH / 2, doorZ]}>
              <boxGeometry args={[DOOR_FRAME_THICKNESS, doorH, DOOR_FRAME_THICKNESS]} />
              <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.25} emissive={d.color} emissiveIntensity={0.18} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, doorH - DOOR_FRAME_THICKNESS / 2, doorZ]}>
            <boxGeometry args={[DOOR_WIDTH, DOOR_FRAME_THICKNESS, DOOR_FRAME_THICKNESS]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.25} emissive={d.color} emissiveIntensity={0.18} />
          </mesh>
          {/* Glass panel */}
          <mesh position={[0, doorH / 2, doorZ]}>
            <boxGeometry args={[DOOR_WIDTH - DOOR_FRAME_THICKNESS * 2, doorH - DOOR_FRAME_THICKNESS * 3, 0.008]} />
            <meshPhysicalMaterial
              color="#182840"
              metalness={0.05}
              roughness={0.04}
              transparent
              opacity={0.42}
              envMapIntensity={0.6}
              emissive={d.color}
              emissiveIntensity={0.08}
            />
          </mesh>
          {/* Handle bar */}
          <mesh position={[hingeX - 0.06, doorH * 0.55, doorZ + 0.015]}>
            <boxGeometry args={[0.015, 0.14, 0.01]} />
            <meshStandardMaterial color="#8899cc" metalness={0.85} roughness={0.15} emissive={d.color} emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Corridor Logo — neon 110lymph sign ─────────────────────────────
function CorridorLogo({ gridCols, gridRows }: { gridCols: number; gridRows: number }) {
  const fw = gridCols * 1.5
  const fd = gridRows * 1.5

  // Corridor south wall is the divider at rowZ(5)
  // Row 5 top boundary in world coords
  const cellD = fd / gridRows
  const rowZ5 = -(5 * cellD - fd / 2)

  const logoX = 1.5
  const logoY = 0.55
  const logoZ = rowZ5 - 0.06 // just north (corridor side) of the south divider

  const boardW = 1.6
  const boardH = 0.35

  return (
    <group position={[logoX, logoY, logoZ]}>
      {/* Backing plate — dark metal */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[boardW, boardH, 0.03]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Neon tube frame — glowing border */}
      {[
        [-boardW / 2 + 0.02, 0, 0.03],
        [boardW / 2 - 0.02, 0, 0.03],
      ].map(([fx, fy, fz], i) => (
        <mesh key={`nf-v-${i}`} position={[fx, fy, fz]}>
          <boxGeometry args={[0.015, boardH - 0.04, 0.015]} />
          <meshStandardMaterial color="#39bae6" emissive="#39bae6" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {[
        [0, boardH / 2 - 0.02, 0.03],
        [0, -boardH / 2 + 0.02, 0.03],
      ].map(([fx, fy, fz], i) => (
        <mesh key={`nf-h-${i}`} position={[fx, fy, fz]}>
          <boxGeometry args={[boardW - 0.04, 0.015, 0.015]} />
          <meshStandardMaterial color="#39bae6" emissive="#39bae6" emissiveIntensity={1.2} />
        </mesh>
      ))}

      {/* Speed-stripe accent — right edge */}
      <mesh position={[boardW / 2 - 0.06, 0, 0.04]}>
        <boxGeometry args={[0.04, boardH - 0.06, 0.015]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>

      {/* Logo text — 110lymph */}
      <Text
        position={[0, 0, 0.04]}
        fontSize={0.21}
        color="#39bae6"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.008}
        outlineColor="#0d3b5e"
      >
        110lymph
      </Text>

      {/* Glow spill light */}
      <pointLight position={[0, 0, 0.25]} intensity={0.8} color="#39bae6" distance={1.5} />
    </group>
  )
}

// ─── Specialist Avatars — 8-Zone Assignments ────────────────────────
// NOTE: Several specialists temporarily assigned to lounge for visual testing
const SPECIALIST_ZONES: Record<string, string> = {
  main: 'oly_office',
  builder: 'datacenter',
  sentry: 'lounge',
  bulwark: 'server_room',
  archive: 'lounge',
  sage: 'lounge',
  haven: 'lounge',
  ledger: 'the_office',
}

// Status → zone mapping (fix: debrief→meeting, NOT lounge)
const STATUS_ZONE_MAP: Record<string, string> = {
  consulting: 'meeting',
  debrief: 'meeting',
  documenting: 'the_office',
  idle: 'lounge',
  // working: no entry → falls through to per-specialist SPECIALIST_ZONES
}

const SPECIALIST_EMOJIS: Record<string, string> = {
  main: '\u2699\uFE0F',
  builder: '\uD83D\uDCE6',
  sentry: '\uD83C\uDF10',
  bulwark: '\uD83D\uDDA5\uFE0F',
  archive: '\uD83D\uDCBE',
  sage: '\uD83E\uDDE0',
  haven: '\uD83C\uDFE0',
  ledger: '\uD83C\uDFE6',
}

const SPECIALIST_COLORS: Record<string, string> = {
  main: '#00ccff',
  builder: '#00ff88',
  sentry: '#4488ff',
  bulwark: '#ff0044',
  archive: '#ffaa00',
  sage: '#cc88ff',
  haven: '#00ff88',
  ledger: '#ff4488',
}

// ─── Status-to-color mapping (always visible) ──────────────────────
const STATUS_COLORS: Record<string, string> = {
  consulting: '#ffaa00',   // neon amber
  working: '#00ff88',      // neon green
  debrief: '#cc88ff',      // neon purple
  documenting: '#4488ff',  // neon blue
  idle: '#556688',         // muted blue-grey
}

const STATUS_LABELS: Record<string, string> = {
  consulting: 'Consulting',
  working: 'Working',
  debrief: 'Debriefing',
  documenting: 'Documenting',
  idle: 'Idle',
}

function formatRuntime(seconds: number): string {
  if (!seconds || seconds < 0) return ''
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function computeRuntimeFromStartedAt(startedAt?: string): number {
  if (!startedAt) return 0
  const started = new Date(startedAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - started) / 1000))
}

function SpecialistAgent({ spec, zone, activePhase }: { spec: SpecialistData; zone: ZoneConfig | undefined; activePhase?: string }) {
  const ref = useRef<THREE.Group>(null!)
  const bobRef = useRef(0)
  const [runtime, setRuntime] = useState(0)
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3())
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3())
  const needsInit = useRef(true)

  const cellW = (GRID_COLS * 1.5) / GRID_COLS
  const cellD = (GRID_ROWS * 1.5) / GRID_ROWS
  const fw = GRID_COLS * 1.5
  const fd = GRID_ROWS * 1.5

  const seed = useMemo(() => {
    let hash = 0
    for (let i = 0; i < spec.name.length; i++) hash = ((hash << 5) - hash) + spec.name.charCodeAt(i)
    return Math.abs(hash)
  }, [spec.name])

  // Compute initial runtime from API data
  const initialRuntime = useMemo(() => {
    if (spec.task_runtime && spec.task_runtime > 0) return spec.task_runtime
    if (spec.started_at) return computeRuntimeFromStartedAt(spec.started_at)
    return 0
  }, [spec.task_runtime, spec.started_at])

  // Tick runtime every second for working agents
  useEffect(() => {
    const isWorking = spec.status === 'working' || spec.status === 'consulting'
    if (!isWorking || initialRuntime <= 0) {
      setRuntime(initialRuntime)
      return
    }
    setRuntime(initialRuntime)
    const interval = setInterval(() => {
      setRuntime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [initialRuntime, spec.status])

  if (!zone) return null

  const offsetX = ((seed % 100) / 100 - 0.5) * zone.colSpan * cellW * 0.6
  const offsetZ = (((seed * 37) % 100) / 100 - 0.5) * zone.rowSpan * cellD * 0.6
  const x = zone.col * cellW + (zone.colSpan * cellW) / 2 - fw / 2 + offsetX
  const z = -(zone.row * cellD + (zone.rowSpan * cellD) / 2 - fd / 2) + offsetZ

  // Update target position when zone changes
  useEffect(() => {
    targetPos.current.set(x, 0, z)
    if (needsInit.current) {
      currentPos.current.set(x, 0, z)
      needsInit.current = false
    }
  }, [x, z])

  // Status-based coloring — always applied
  const phaseStatus = spec.status || 'idle'
  const statusColor = STATUS_COLORS[phaseStatus] || STATUS_COLORS.idle
  const statusLabel = STATUS_LABELS[phaseStatus] || phaseStatus
  
  // Phase-aware: highlight matching phase from workflow bar
  const phaseConfig = WORKFLOW_PHASES.find(p => p.id === phaseStatus)
  const phaseColor = phaseConfig?.color || statusColor
  
  // Default specialist identity color
  const defaultColor = SPECIALIST_COLORS[spec.name] || '#6b7280'
  const emoji = spec.emoji || SPECIALIST_EMOJIS[spec.name] || '👤'
  
  // Highlight when this agent matches the selected WorkflowBar phase
  const isPhaseHighlighted = activePhase !== undefined && activePhase === phaseStatus
  const isWorking = spec.status === 'working'
  const isActive = spec.status !== 'idle'
  
  // Task display
  const taskLabel = spec.task || spec.task_label || ''
  const runtimeStr = runtime > 0 ? formatRuntime(runtime) : ''

  // Agent name display
  const displayName = spec.name.charAt(0).toUpperCase() + spec.name.slice(1)

  useFrame((_, delta) => {
    if (ref.current) {
      // Smooth position lerp toward target zone
      const lerpSpeed = 6.0
      currentPos.current.lerp(targetPos.current, Math.min(1, delta * lerpSpeed))
      ref.current.position.x = currentPos.current.x
      ref.current.position.z = currentPos.current.z
      
      bobRef.current += delta * (isWorking ? 2.5 : isActive ? 2.0 : 0.8)
      const baseY = 0.80
      const amplitude = isWorking ? 0.06 : isActive ? 0.04 : 0.02
      ref.current.position.y = baseY + Math.sin(bobRef.current) * amplitude
    }
  })

  return (
    <group ref={ref} position={[x, 0.65, z]}>
      {/* ─── Holographic Base Ring — pulsing neon glow ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[0.30, 0.36, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={isActive ? 0.60 : 0.15}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Phase highlight ring — outer double ring when phase matches */}
      {isPhaseHighlighted && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
            <ringGeometry args={[0.38, 0.44, 32]} />
            <meshBasicMaterial
              color={phaseColor}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
            <ringGeometry args={[0.46, 0.49, 32]} />
            <meshBasicMaterial
              color={phaseColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* ─── Holographic Orb — transparent glass sphere with glow ─── */}
      {/* Outer glow shell */}
      <mesh>
        <sphereGeometry args={[0.21, 24, 24]} />
        <meshBasicMaterial
          color={isActive ? statusColor : defaultColor}
          transparent
          opacity={isActive ? 0.12 : 0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      
      {/* Main hologram sphere — glass-like core */}
      <mesh castShadow>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshPhysicalMaterial
          color={isActive ? statusColor : defaultColor}
          roughness={0.15}
          metalness={0.05}
          emissive={isActive ? statusColor : defaultColor}
          emissiveIntensity={isActive ? (isWorking ? 0.9 : 0.6) : 0.08}
          transparent
          opacity={0.72}
          envMapIntensity={0.3}
          clearcoat={0.1}
        />
      </mesh>

      {/* Wireframe cage — angular geometric shell */}
      <mesh>
        <sphereGeometry args={[0.19, 8, 6]} />
        <meshBasicMaterial
          color={isActive ? statusColor : defaultColor}
          transparent
          opacity={isWorking ? 0.5 : isActive ? 0.3 : 0.08}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Orbital Rings — rotating neon halos ─── */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]} position={[0, 0.22, 0]}>
        <torusGeometry args={[0.2, 0.018, 8, 20]} />
        <meshStandardMaterial
          color={isActive ? statusColor : defaultColor}
          emissive={isActive ? statusColor : defaultColor}
          emissiveIntensity={isWorking ? 1.2 : isActive ? 0.7 : 0.1}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* Secondary ring — tilted axis, faster rotation for working */}
      {isActive && (
        <mesh rotation={[-Math.PI / 3, 0, Math.PI / 4]} position={[0, 0.22, 0]}>
          <torusGeometry args={[0.22, 0.01, 6, 18]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={isWorking ? 0.7 : 0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ─── Agent name — floating below orb ─── */}
      <Text
        position={[0, -0.36, 0]} fontSize={0.10}
        anchorX="center" anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.01} outlineColor="#040811"
        color={isActive ? '#e0e8f8' : '#7788aa'}
        fontWeight="bold"
      >
        {displayName}
      </Text>

      {/* ─── Emoji label — above orb ─── */}
      <Text
        position={[0, 0.45, 0]} fontSize={0.18}
        anchorX="center" anchorY="bottom"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.012} outlineColor="#040811"
        color={isActive ? '#ffffff' : '#8899bb'}
      >
        {emoji}
      </Text>

      {/* ─── Status label — floating above ─── */}
      <Text
        position={[0, 0.66, 0]} fontSize={0.10}
        anchorX="center" anchorY="bottom"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.009} outlineColor="#040811"
        color={statusColor}
      >
        {statusLabel}
      </Text>

      {/* Task label — dimmer, below status */}
      {taskLabel && (
        <Text
          position={[0, 0.79, 0]} fontSize={0.07}
          anchorX="center" anchorY="bottom"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.006} outlineColor="#040811"
          color="#8899bb"
          maxWidth={2.0}
        >
          {taskLabel}
        </Text>
      )}

      {/* Runtime — cyberpunk timer */}
      {runtimeStr && (
        <Text
          position={[0, 0.88, 0]} fontSize={0.065}
          anchorX="center" anchorY="bottom"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.006} outlineColor="#040811"
          color="#8899bb"
        >
          ⏱ {runtimeStr}
        </Text>
      )}

      {/* Phase indicator — small glowing orb below agent */}
      <mesh position={[0, -0.22, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isPhaseHighlighted ? 1.2 : isActive ? 0.8 : 0.15}
          roughness={0.1}
        />
      </mesh>
    </group>
  )
}

function SpecialistAvatars({ specialists, activePhase }: { specialists: SpecialistData[]; activePhase?: string }) {
  if (!specialists || specialists.length === 0) return null
  return (
    <group>
      {specialists.map((spec) => {
        // Zone resolution with activePhase override:
        // When WorkflowBar phase is selected, agents matching that phase
        // are repositioned to the status-mapped zone (overriding API zone).
        const statusMatchesPhase = activePhase && spec.status === activePhase
        const forcedZone = statusMatchesPhase && spec.status
          ? (STATUS_ZONE_MAP[spec.status] || null)
          : null
        const zoneId = forcedZone
          || spec.zone
          || (spec.status && STATUS_ZONE_MAP[spec.status])
          || SPECIALIST_ZONES[spec.name]
        if (!zoneId) return null
        const zone = ZONES.find((z) => z.id === zoneId)
        if (!zone) return null
        return <SpecialistAgent key={spec.name} spec={spec} zone={zone} activePhase={activePhase} />
      })}
    </group>
  )
}

function SceneContent({ selectedZone, onSelectZone, hoveredZone, onHoverZone, specialists, activePhase }: FloorPlanProps) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#040811', 0.005)
  }, [scene])

  return (
    <>
      <Lights />
      <Floor gridCols={GRID_COLS} gridRows={GRID_ROWS} />
      <Walls gridCols={GRID_COLS} gridRows={GRID_ROWS} />
      <ZoneWalls gridCols={GRID_COLS} gridRows={GRID_ROWS} />
      <GlassWalls gridCols={GRID_COLS} gridRows={GRID_ROWS} />
      <GlassDoors gridCols={GRID_COLS} gridRows={GRID_ROWS} />
      <CorridorLogo gridCols={GRID_COLS} gridRows={GRID_ROWS} />

      {ZONES.map((zone) => (
        <Suspense
          key={zone.id}
          fallback={
            <mesh
              position={[
                zone.col * (GRID_COLS * 1.5 / GRID_COLS) + (zone.colSpan * (GRID_COLS * 1.5 / GRID_COLS)) / 2 - (GRID_COLS * 1.5) / 2,
                0.04,
                -(zone.row * (GRID_ROWS * 1.5 / GRID_ROWS) + (zone.rowSpan * (GRID_ROWS * 1.5 / GRID_ROWS)) / 2 - (GRID_ROWS * 1.5) / 2),
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[1, 0.5]} />
              <meshBasicMaterial color="#1e2a3a" transparent opacity={0.5} />
            </mesh>
          }
        >
          <ZoneBlock
            zone={zone}
            gridCols={GRID_COLS} gridRows={GRID_ROWS}
            onClick={onSelectZone}
            isSelected={selectedZone?.id === zone.id}
            isHovered={hoveredZone === zone.id}
            onHover={onHoverZone}
          />
        </Suspense>
      ))}

      {/* 3D Furniture — Ray's Grid Layout */}
      <SpecialistAvatars specialists={specialists || []} activePhase={activePhase} />
      
      {/* ─── Server Room racks — top-left, face south (2×3 zone) ─── */}
      <ServerRacks
        col={0} row={0} colSpan={2} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
        color="#ff0044" zoneId="server_room"
        facingDirection="north"
      />
      
      {/* ─── Data Centre — hexagonal portal, Traefik label, data wall displays ─── */}
      <DataCentrePortal
        col={0} row={5} colSpan={2} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />

      {/* ─── The Office — bottom-right (cols 7-9, rows 5-7) ─── */}
      <TheOfficeFurniture
        col={7} row={5} colSpan={3} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
      
      <PatchRoomFurniture
        col={2} row={0} colSpan={3} rowSpan={2}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
      <VaultFurniture
        col={5} row={0} colSpan={3} rowSpan={2}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
      <LoungeFurniture
        col={8} row={0} colSpan={2} rowSpan={4}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
      <OfficeFurniture
        col={2} row={5} colSpan={2} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
      <MeetingFurniture
        col={4} row={5} colSpan={3} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />

      {/* ─── Corridor Decor — hallway markings, plants, water coolers ─── */}
      <CorridorDecor gridCols={GRID_COLS} gridRows={GRID_ROWS} />


      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
    </>
  )
}

export default function FloorPlan3D({ selectedZone, onSelectZone, hoveredZone, onHoverZone, specialists, activePhase }: FloorPlanProps) {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 8, 5], fov: 45, near: 0.1, far: 100 }}
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: '#040811' }}
      >
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#39bae6] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#6c7a8d] text-sm">Loading 3D Office...</span>
            </div>
          </Html>
        }>
          <SceneContent
            selectedZone={selectedZone} onSelectZone={onSelectZone}
            hoveredZone={hoveredZone} onHoverZone={onHoverZone}
            specialists={specialists}
            activePhase={activePhase}
          />
        </Suspense>
        <OrbitControls
          enableDamping dampingFactor={0.1}
          minDistance={3} maxDistance={15} maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.15}
            luminanceSmoothing={0.85}
            intensity={1.1}
            radius={0.5}
            mipmapBlur
          />
          <Noise opacity={0.012} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
