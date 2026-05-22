import React, { Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'
import ZoneBlock from './ZoneBlock'
import SpecialistAvatar, { resolveZoneId } from './SpecialistAvatar'
import { ServerRacks } from './RackBlock'
import OfficeFurniture from './OfficeFurniture'
import PatchRoomFurniture from './PatchRoomFurniture'
import VaultFurniture from './VaultFurniture'
import MeetingFurniture from './MeetingFurniture'
import TheOfficeFurniture from './TheOfficeFurniture'
import LoungeFurniture from './LoungeFurniture'
import CorridorDecor from './CorridorDecor'
import DataCentrePortal from './DataCentrePortal'
import { ZONES, ZoneConfig } from '../data/zones'
import { SpecialistData } from '../App'

const GRID_COLS = 12
const GRID_ROWS = 8
const CELL = 1.5
const FLOOR_COLOR = '#0a0e17'
const GRID_COLOR = '#1a2a3a'
const WALL_COLOR = '#0d1320'
const GLASS_COLOR = '#1a2a4a'
const DIVIDER_HEIGHT = 0.35
const GLASS_HEIGHT = 0.65
const GLASS_THICKNESS = 0.02
const DIVIDER_THICKNESS = 0.08
const DOOR_WIDTH = 0.4
const DOOR_FRAME_THICKNESS = 0.015

// ─── Types ──────────────────────────────────────────────────────────
interface FloorPlanProps {
  selectedZone: ZoneConfig | null
  onSelectZone: (zone: ZoneConfig | null) => void
  hoveredZone: string | null
  onHoverZone: (id: string | null) => void
  specialists: SpecialistData[]
  onHoverSpecialist: (spec: SpecialistData | null) => void
  hoveredSpecialist: SpecialistData | null
}

// ─── Dark Floor ─────────────────────────────────────────────────────
function Floor() {
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL

  return (
    <group>
      {/* Main dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[fw + 2, fd + 2]} />
        <meshStandardMaterial
          color={FLOOR_COLOR}
          roughness={0.50}
          metalness={0.15}
        />
      </mesh>
      {/* Subtle grid lines */}
      <gridHelper
        args={[
          Math.max(fw, fd) + 0.5,
          Math.max(GRID_COLS, GRID_ROWS),
          GRID_COLOR,
          '#0d1625',
        ]}
        position={[0, 0.001, 0]}
      />
      {/* Subtle reflective sheen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[fw, fd]} />
        <meshStandardMaterial
          color="#0d1320"
          roughness={0.30}
          metalness={0.20}
          transparent
          opacity={0.35}
        />
      </mesh>
    </group>
  )
}

// ─── Dark Walls ─────────────────────────────────────────────────────
function Walls() {
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL
  const hw = fw / 2 + 0.5
  const hd = fd / 2 + 0.5
  const wallHeight = 0.35

  return (
    <group>
      {[
        [0, wallHeight / 2, -hd, fw + 1, wallHeight, 0.06],
        [0, wallHeight / 2, hd, fw + 1, wallHeight, 0.06],
        [-hw, wallHeight / 2, 0, 0.06, wallHeight, fd + 1],
        [hw, wallHeight / 2, 0, 0.06, wallHeight, fd + 1],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={`wall-${i}`} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[w as number, h as number, d as number]} />
          <meshStandardMaterial
            color={WALL_COLOR}
            roughness={0.55}
            metalness={0.10}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Zone Divider Walls ─────────────────────────────────────────────
function ZoneWalls() {
  const cellW = (GRID_COLS * CELL) / GRID_COLS
  const cellD = (GRID_ROWS * CELL) / GRID_ROWS
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL
  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const walls: { x: number; z: number; w: number; d: number }[] = [
    // Vertical walls
    { x: colX(2), z: (rowZ(0) + rowZ(2)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(2) - rowZ(0)) },
    { x: colX(2), z: (rowZ(5) + rowZ(8)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(8) - rowZ(5)) },
    { x: colX(5), z: (rowZ(0) + rowZ(2)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(2) - rowZ(0)) },
    { x: colX(4), z: (rowZ(5) + rowZ(8)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(8) - rowZ(5)) },
    { x: colX(7), z: (rowZ(5) + rowZ(8)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(8) - rowZ(5)) },
    { x: colX(8), z: (rowZ(0) + rowZ(4)) / 2, w: DIVIDER_THICKNESS, d: Math.abs(rowZ(4) - rowZ(0)) },
    // Horizontal walls
    { x: (colX(2) + colX(8)) / 2, z: rowZ(2), w: Math.abs(colX(8) - colX(2)), d: DIVIDER_THICKNESS },
    { x: (colX(0) + colX(2)) / 2, z: rowZ(3), w: Math.abs(colX(2) - colX(0)), d: DIVIDER_THICKNESS },
    { x: (colX(8) + colX(10)) / 2, z: rowZ(4), w: Math.abs(colX(10) - colX(8)), d: DIVIDER_THICKNESS },
    { x: (colX(0) + colX(10)) / 2, z: rowZ(5), w: Math.abs(colX(10) - colX(0)), d: DIVIDER_THICKNESS },
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
          <boxGeometry args={[w.w, DIVIDER_HEIGHT, w.d]} />
          <meshStandardMaterial
            color="#0d1625"
            roughness={0.50}
            metalness={0.12}
            emissive="#1a2a3a"
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Glass Partition Walls ──────────────────────────────────────────
function GlassWalls() {
  const cellW = (GRID_COLS * CELL) / GRID_COLS
  const cellD = (GRID_ROWS * CELL) / GRID_ROWS
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL
  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const panels: { x: number; z: number; isH: boolean; length: number; color: string }[] = [
    // Vertical
    { x: colX(2), z: (rowZ(0) + rowZ(2)) / 2, isH: false, length: Math.abs(rowZ(2) - rowZ(0)), color: '#ff0044' },
    { x: colX(2), z: (rowZ(5) + rowZ(8)) / 2, isH: false, length: Math.abs(rowZ(8) - rowZ(5)), color: '#00ff88' },
    { x: colX(5), z: (rowZ(0) + rowZ(2)) / 2, isH: false, length: Math.abs(rowZ(2) - rowZ(0)), color: '#ff6600' },
    { x: colX(4), z: (rowZ(5) + rowZ(8)) / 2, isH: false, length: Math.abs(rowZ(8) - rowZ(5)), color: '#00ccff' },
    { x: colX(7), z: (rowZ(5) + rowZ(8)) / 2, isH: false, length: Math.abs(rowZ(8) - rowZ(5)), color: '#4488ff' },
    { x: colX(8), z: (rowZ(0) + rowZ(4)) / 2, isH: false, length: Math.abs(rowZ(4) - rowZ(0)), color: '#ff00ff' },
    // Horizontal
    { x: (colX(2) + colX(8)) / 2, z: rowZ(2), isH: true, length: Math.abs(colX(8) - colX(2)), color: '#ff6600' },
    { x: (colX(0) + colX(2)) / 2, z: rowZ(3), isH: true, length: Math.abs(colX(2) - colX(0)), color: '#ff0044' },
    { x: (colX(8) + colX(10)) / 2, z: rowZ(4), isH: true, length: Math.abs(colX(10) - colX(8)), color: '#ff00ff' },
    { x: (colX(0) + colX(10)) / 2, z: rowZ(5), isH: true, length: Math.abs(colX(10) - colX(0)), color: '#00ff88' },
  ]

  const glassY = DIVIDER_HEIGHT + GLASS_HEIGHT / 2

  return (
    <group>
      {panels.map((g, i) => (
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
            color="#182840"
            metalness={0.06}
            roughness={0.08}
            transparent
            opacity={0.22}
            envMapIntensity={0.4}
            clearcoat={0.10}
            clearcoatRoughness={0.15}
            emissive={g.color}
            emissiveIntensity={0.04}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Glass Doors ────────────────────────────────────────────────────
function GlassDoors() {
  const cellW = (GRID_COLS * CELL) / GRID_COLS
  const cellD = (GRID_ROWS * CELL) / GRID_ROWS
  const fw = GRID_COLS * CELL
  const fd = GRID_ROWS * CELL
  const colX = (c: number) => c * cellW - fw / 2
  const rowZ = (r: number) => -(r * cellD - fd / 2)

  const doors = [
    { x: (colX(0) + colX(2)) / 2, z: rowZ(3), color: '#ff0044' },
    { x: (colX(2) + colX(4)) / 2, z: rowZ(2), color: '#ff6600' },
    { x: (colX(5) + colX(7)) / 2, z: rowZ(2), color: '#ffaa00' },
    { x: (colX(8) + colX(10)) / 2, z: rowZ(4), color: '#ff00ff' },
    { x: (colX(0) + colX(2)) / 2, z: rowZ(5), color: '#00ff88' },
    { x: (colX(2) + colX(4)) / 2, z: rowZ(5), color: '#00ccff' },
    { x: (colX(4) + colX(7)) / 2, z: rowZ(5), color: '#4488ff' },
    { x: (colX(7) + colX(10)) / 2, z: rowZ(5), color: '#8844ff' },
  ]

  const doorBaseY = 0.01
  const doorTopY = DIVIDER_HEIGHT + GLASS_HEIGHT
  const doorH = doorTopY - doorBaseY
  const hingeX = DOOR_WIDTH / 2 - DOOR_FRAME_THICKNESS / 2
  const doorZ = DIVIDER_THICKNESS / 2 + 0.02

  return (
    <group>
      {doors.map((d, i) => (
        <group key={`door-${i}`} position={[d.x, doorBaseY, d.z]}>
          {/* Door frame posts */}
          {[-hingeX, hingeX].map((fx, j) => (
            <mesh key={`post-${j}`} position={[fx, doorH / 2, doorZ]}>
              <boxGeometry args={[DOOR_FRAME_THICKNESS, doorH, DOOR_FRAME_THICKNESS]} />
              <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.25} emissive={d.color} emissiveIntensity={0.15} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, doorH - DOOR_FRAME_THICKNESS / 2, doorZ]}>
            <boxGeometry args={[DOOR_WIDTH, DOOR_FRAME_THICKNESS, DOOR_FRAME_THICKNESS]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.25} emissive={d.color} emissiveIntensity={0.15} />
          </mesh>
          {/* Glass panel */}
          <mesh position={[0, doorH / 2, doorZ]}>
            <boxGeometry args={[DOOR_WIDTH - DOOR_FRAME_THICKNESS * 2, doorH - DOOR_FRAME_THICKNESS * 3, 0.008]} />
            <meshPhysicalMaterial
              color="#182840"
              metalness={0.05}
              roughness={0.05}
              transparent
              opacity={0.38}
              envMapIntensity={0.5}
              emissive={d.color}
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* Handle */}
          <mesh position={[hingeX - 0.06, doorH * 0.55, doorZ + 0.015]}>
            <boxGeometry args={[0.015, 0.14, 0.01]} />
            <meshStandardMaterial color="#8899cc" metalness={0.85} roughness={0.15} emissive={d.color} emissiveIntensity={0.20} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── 110lymph Neon Sign ────────────────────────────────────────────
function CorridorLogo() {
  const cellD = (GRID_ROWS * CELL) / GRID_ROWS
  const fd = GRID_ROWS * CELL
  const rowZ5 = -(5 * cellD - fd / 2)

  const boardW = 1.6
  const boardH = 0.35

  return (
    <group position={[1.5, 0.55, rowZ5 - 0.06]}>
      {/* Backing plate */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[boardW, boardH, 0.03]} />
        <meshStandardMaterial color="#0d111f" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Neon border */}
      {[
        [-boardW / 2 + 0.02, 0],
        [boardW / 2 - 0.02, 0],
        [0, boardH / 2 - 0.02],
        [0, -boardH / 2 + 0.02],
      ].map(([fx, fy], i) => (
        <mesh key={`nframe-${i}`} position={[fx, fy, 0.03]}>
          <boxGeometry args={[
            i < 2 ? 0.015 : boardW - 0.04,
            i < 2 ? boardH - 0.04 : 0.015,
            0.015,
          ]} />
          <meshStandardMaterial color="#39bae6" emissive="#39bae6" emissiveIntensity={1.2} />
        </mesh>
      ))}

      {/* Speed stripe */}
      <mesh position={[boardW / 2 - 0.06, 0, 0.04]}>
        <boxGeometry args={[0.04, boardH - 0.06, 0.015]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>

      {/* Logo text */}
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

      <pointLight position={[0, 0, 0.25]} intensity={0.8} color="#39bae6" distance={1.5} />
    </group>
  )
}

// ─── Zone Ambient Lights ────────────────────────────────────────────
function ZoneLights() {
  return (
    <>
      {ZONES.map(zone => {
        const cellW = (GRID_COLS * CELL) / GRID_COLS
        const cellD = (GRID_ROWS * CELL) / GRID_ROWS
        const fw = GRID_COLS * CELL
        const fd = GRID_ROWS * CELL
        const cx = zone.col * cellW + (zone.colSpan * cellW) / 2 - fw / 2
        const cz = -(zone.row * cellD + (zone.rowSpan * cellD) / 2 - fd / 2)

        return (
          <pointLight
            key={`zone-light-${zone.id}`}
            position={[cx, 0.5, cz]}
            intensity={0.6}
            color={zone.color}
            distance={3.5}
          />
        )
      })}
    </>
  )
}

// ─── Scene Lights ───────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} color="#1a2a3a" />

      {/* Overhead area lights */}
      <pointLight position={[0, 7, 0]} intensity={0.8} color="#334466" distance={14} />
      <pointLight position={[-4, 6, -3]} intensity={0.6} color="#334466" distance={10} />
      <pointLight position={[4, 6, 3]} intensity={0.6} color="#334466" distance={10} />
      <pointLight position={[-4, 6, 3]} intensity={0.5} color="#334455" distance={9} />
      <pointLight position={[4, 6, -3]} intensity={0.5} color="#334455" distance={9} />

      {/* Corridor ambient */}
      <pointLight position={[0, 2.5, 0]} intensity={0.4} color="#334466" distance={6} />

      {/* Zone accent lights */}
      <ZoneLights />
    </>
  )
}

// ─── Specialist Avatars Group ───────────────────────────────────────
function SpecialistAvatars({ specialists, onHoverSpecialist, hoveredSpecialist }: {
  specialists: SpecialistData[]
  onHoverSpecialist: (spec: SpecialistData | null) => void
  hoveredSpecialist: SpecialistData | null
}) {
  if (!specialists?.length) return null

  return (
    <group>
      {specialists.map(spec => {
        const zoneId = resolveZoneId(spec)
        if (!zoneId) return null
        const zone = ZONES.find(z => z.id === zoneId)
        if (!zone) return null
        return (
          <SpecialistAvatar
            key={spec.name}
            spec={spec}
            zone={zone}
            onHover={onHoverSpecialist}
          />
        )
      })}
    </group>
  )
}

// ─── Scene Content (runs inside Canvas) ─────────────────────────────
function SceneContent({ selectedZone, onSelectZone, hoveredZone, onHoverZone, specialists, onHoverSpecialist, hoveredSpecialist }: FloorPlanProps) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#0a0e17', 0.0025)
    scene.background = new THREE.Color('#0a0e17')
  }, [scene])

  return (
    <>
      <Lights />
      <Floor />
      <Walls />
      <ZoneWalls />
      <GlassWalls />
      <GlassDoors />
      <CorridorLogo />

      {/* Zone floor plates */}
      {ZONES.map(zone => (
        <Suspense
          key={zone.id}
          fallback={
            <mesh
              scale={[1, 1, 0.5]}
              position={[
                zone.col * CELL + (zone.colSpan * CELL) / 2 - (GRID_COLS * CELL) / 2,
                0.04,
                -(zone.row * CELL + (zone.rowSpan * CELL) / 2 - (GRID_ROWS * CELL) / 2),
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry />
              <meshBasicMaterial color="#1e2a3a" transparent opacity={0.5} />
            </mesh>
          }
        >
          <ZoneBlock
            zone={zone}
            gridCols={GRID_COLS}
            gridRows={GRID_ROWS}
            onClick={(z) => onSelectZone(z === selectedZone ? null : z)}
            isSelected={selectedZone?.id === zone.id}
            isHovered={hoveredZone === zone.id}
            onHover={onHoverZone}
          />
        </Suspense>
      ))}

      {/* Specialist Avatars */}
      <SpecialistAvatars specialists={specialists} onHoverSpecialist={onHoverSpecialist} hoveredSpecialist={hoveredSpecialist} />

      {/* Furniture */}
      <ServerRacks
        col={0} row={0} colSpan={2} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
        color="#2299dd" zoneId="server_room"
        facingDirection="north"
      />
      <DataCentrePortal
        col={0} row={5} colSpan={2} rowSpan={3}
        gridCols={GRID_COLS} gridRows={GRID_ROWS}
      />
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
      <CorridorDecor gridCols={GRID_COLS} gridRows={GRID_ROWS} />

      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
    </>
  )
}

// ─── WebGL Error Boundary ───────────────────────────────────────────
interface EBState { hasError: boolean; error: string | null }

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WebGL ErrorBoundary]', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-[#0a0e17]">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="text-4xl">🖥️</div>
            <div className="text-[#ef4444] text-lg font-bold">WebGL Render Error</div>
            <div className="text-[#6c7a8d] text-sm max-w-md">{this.state.error}</div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="px-4 py-2 bg-[#1a3355] text-[#39bae6] rounded-md hover:bg-[#2a4477] text-sm"
            >
              Reload View
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Main Export ────────────────────────────────────────────────────
export default function FloorPlan3D(props: FloorPlanProps) {
  return (
    <div className="w-full h-full absolute inset-0">
      <WebGLErrorBoundary>
        <Canvas
          camera={{ position: [0, 8, 5], fov: 45, near: 0.1, far: 100 }}
          shadows
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
        >
          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#39bae6] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#6c7a8d] text-sm">Loading 3D Office...</span>
              </div>
            </Html>
          }>
            <SceneContent {...props} />
          </Suspense>
          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            minDistance={3}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 0, 0]}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  )
}
