import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════
// Oly's Office — Minimalist Dual-Monitor Command Center (Image 34 Ref)
// ═══════════════════════════════════════════════════════════════════
// Clean dual-monitor workstations with white matte desks, ergonomic
// blue-accent chairs, floor-to-ceiling window wall with golden-hour
// city view, holographic data projections, polished resin floor,
// recessed cyan wall lighting. Professional corporate futurism.

interface OfficeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// ─── Colors (Ref Image 34 Corporate Palette) ────────────────────────
const DESK_WHITE = '#e8edf2'
const DESK_TRIM = '#d0d6de'
const DESK_LEG = '#b8c0ca'
const MONITOR_BEZEL = '#111318'
const CHAIR_BLUE = '#3388cc'
const CHAIR_FRAME = '#8899aa'
const CYAN_ACCENT = '#39bae6'
const WALL_WHITE = '#e8ecef'
const FLOOR_GREY = '#b0b8c0'
const GOLDEN_HUE = '#ffaa66'
const HOLO_CYAN = '#44ccff'

// ─── Dual Monitor Setup — two wide monitors side-by-side ───────────
function DualMonitors({ position }: { position: [number, number, number] }) {
  const scrW = 0.24
  const scrH = 0.135
  const gap = 0.02

  return (
    <group position={position}>
      {[-1, 1].map((side, i) => {
        const sx = side * (scrW / 2 + gap / 2)
        return (
          <group key={`mon-${i}`} position={[sx, scrH / 2 + 0.015, 0]}>
            {/* Monitor bezel — ultra-slim black */}
            <mesh castShadow>
              <boxGeometry args={[scrW, scrH, 0.008]} />
              <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.45} roughness={0.15} />
            </mesh>
            {/* Screen surface — dark with emissive data */}
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[scrW - 0.016, scrH - 0.016]} />
              <meshStandardMaterial
                color="#0d1a35"
                emissive="#152545"
                emissiveIntensity={0.55}
                roughness={0.03}
              />
            </mesh>
            {/* Screen content — data UI bars */}
            {Array.from({ length: 6 }).map((_, j) => (
              <mesh key={`ui-${i}-${j}`} position={[scrW * (j % 2 === 0 ? -0.1 : 0.1), scrH * 0.2 - j * scrH * 0.08, 0.01]}>
                <boxGeometry args={[0.04 + j * 0.02, 0.003, 0.001]} />
                <meshBasicMaterial
                  color={j % 3 === 0 ? '#44cc88' : j % 3 === 1 ? '#3399bb' : '#5599dd'}
                  transparent
                  opacity={0.6 + j * 0.04}
                />
              </mesh>
            ))}
            {/* Monitor stand — slim VESA post */}
            <mesh position={[0, -scrH / 2 - 0.025, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.012, 0.05, 8]} />
              <meshStandardMaterial color="#666a72" metalness={0.80} roughness={0.18} />
            </mesh>
            {/* Stand base — minimalist oval */}
            <mesh position={[0, -scrH / 2 - 0.048, 0]}>
              <cylinderGeometry args={[0.03, 0.035, 0.01, 16]} />
              <meshStandardMaterial color="#555a62" metalness={0.75} roughness={0.20} />
            </mesh>
            {/* Thin cyan edge glow */}
            <mesh>
              <boxGeometry args={[scrW + 0.004, scrH + 0.004, 0.003]} />
              <meshBasicMaterial color={CYAN_ACCENT} transparent opacity={0.06} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─── Ergonomic Task Chair — electric blue upholstery ────────────────
function TaskChair({ position, rotation, color }: {
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat cushion */}
      <mesh position={[0, 0.25, 0.01]} castShadow>
        <boxGeometry args={[0.17, 0.028, 0.16]} />
        <meshStandardMaterial color={color} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Seat front curve */}
      <mesh position={[0, 0.25, 0.10]}>
        <cylinderGeometry args={[0.08, 0.08, 0.028, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Backrest — tall ergonomic mesh */}
      <mesh position={[0, 0.45, -0.06]} castShadow>
        <boxGeometry args={[0.16, 0.28, 0.022]} />
        <meshStandardMaterial color={color} metalness={0.03} roughness={0.50} />
      </mesh>
      {/* Backrest top curve */}
      <mesh position={[0, 0.59, -0.06]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
        <meshStandardMaterial color={color} metalness={0.03} roughness={0.50} />
      </mesh>
      {/* Headrest — electric blue accent */}
      <mesh position={[0, 0.63, -0.04]}>
        <boxGeometry args={[0.11, 0.04, 0.018]} />
        <meshStandardMaterial color="#3388cc" metalness={0.03} roughness={0.45} />
      </mesh>
      {/* Lumbar support */}
      <mesh position={[0, 0.36, -0.045]}>
        <boxGeometry args={[0.10, 0.06, 0.014]} />
        <meshStandardMaterial color={color} metalness={0.03} roughness={0.45} />
      </mesh>
      {/* Back frame — dark grey polymer */}
      <mesh position={[0, 0.60, -0.06]}>
        <boxGeometry args={[0.17, 0.01, 0.026]} />
        <meshStandardMaterial color={CHAIR_FRAME} metalness={0.55} roughness={0.30} />
      </mesh>
      {/* Side frame posts */}
      {[-1, 1].map((s) => (
        <mesh key={`sp-${s}`} position={[s * 0.082, 0.45, -0.06]}>
          <boxGeometry args={[0.012, 0.26, 0.026]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.55} roughness={0.30} />
        </mesh>
      ))}
      {/* Armrests — clean padded */}
      {[-1, 1].map((s) => (
        <group key={`arm-${s}`}>
          <mesh position={[s * 0.08, 0.32, 0.02]} castShadow>
            <boxGeometry args={[0.018, 0.02, 0.10]} />
            <meshStandardMaterial color={color} metalness={0.03} roughness={0.50} />
          </mesh>
          <mesh position={[s * 0.08, 0.27, 0.02]}>
            <boxGeometry args={[0.01, 0.07, 0.01]} />
            <meshStandardMaterial color={CHAIR_FRAME} metalness={0.60} roughness={0.25} />
          </mesh>
        </group>
      ))}
      {/* Gas lift cylinder */}
      <mesh position={[0, 0.12, 0.01]}>
        <cylinderGeometry args={[0.014, 0.018, 0.22, 10]} />
        <meshStandardMaterial color="#7a8290" metalness={0.85} roughness={0.10} />
      </mesh>
      {/* 5-star base */}
      <mesh position={[0, 0.03, 0.01]}>
        <cylinderGeometry args={[0.05, 0.06, 0.03, 8]} />
        <meshStandardMaterial color="#4a505a" metalness={0.80} roughness={0.20} />
      </mesh>
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh key={`cb-${j}`} position={[Math.cos(rad) * 0.04, 0.032, Math.sin(rad) * 0.04 + 0.01]} rotation={[0, -rad, 0]}>
            <boxGeometry args={[0.0015, 0.005, 0.06]} />
            <meshStandardMaterial color="#4a505a" metalness={0.80} roughness={0.20} />
          </mesh>
        )
      })}
      {/* Casters */}
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh key={`cs-${j}`} position={[Math.cos(rad) * 0.068, 0.012, Math.sin(rad) * 0.068 + 0.01]}>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.55} roughness={0.35} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── Holographic Data Projection — floating network visualization ───
function HolographicDisplay({ position }: { position: [number, number, number] }) {
  const holoRef = useRef<THREE.Group>(null!)
  const ringRefs = useRef<THREE.Mesh[]>([])
  const nodeRefs = useRef<THREE.Mesh[]>([])

  const nodes = useMemo(() =>
    Array.from({ length: 12 }, () => ({
      x: (Math.random() - 0.5) * 0.55,
      y: (Math.random() * 0.45),
      z: (Math.random() - 0.5) * 0.15,
      size: 0.008 + Math.random() * 0.012,
    })),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (holoRef.current) {
      holoRef.current.rotation.y = Math.sin(t * 0.2) * 0.05
    }
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z += 0.003 * (i + 1)
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0.12 + Math.sin(t * 1.5 + i) * 0.05
      }
    })
    nodeRefs.current.forEach((node, i) => {
      if (node) {
        node.position.y += Math.sin(t * 2 + i) * 0.0005
        const mat = node.material as THREE.MeshBasicMaterial
        mat.opacity = 0.5 + Math.sin(t * 3 + i * 0.7) * 0.3
      }
    })
  })

  return (
    <group ref={holoRef} position={position}>
      {/* Core glow sphere */}
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshBasicMaterial
          color={HOLO_CYAN}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Holographic rings */}
      {[0.18, 0.22, 0.26].map((r, i) => (
        <mesh
          key={`hring-${i}`}
          ref={(el) => { ringRefs.current[i] = el! }}
          position={[0, 0.28, 0]}
          rotation={[Math.PI / 3 + i * 0.3, 0, 0]}
        >
          <ringGeometry args={[r - 0.008, r, 48]} />
          <meshBasicMaterial
            color={HOLO_CYAN}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Floating data nodes */}
      {nodes.map((n, i) => (
        <mesh
          key={`hnode-${i}`}
          ref={(el) => { nodeRefs.current[i] = el! }}
          position={[n.x, n.y + 0.08, n.z]}
        >
          <sphereGeometry args={[n.size, 8, 8]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? '#ffffff' : HOLO_CYAN}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Thin connecting lines */}
      {nodes.slice(0, -1).map((n1, i) => {
        const n2 = nodes[(i + 1) % nodes.length]
        const midX = (n1.x + n2.x) / 2
        const midY = (n1.y + n2.y) / 2 + 0.08
        const midZ = (n1.z + n2.z) / 2
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const dz = n2.z - n1.z
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5
        return (
          <mesh key={`hline-${i}`} position={[midX, midY, midZ]}>
            <boxGeometry args={[length, 0.001, 0.001]} />
            <meshBasicMaterial
              color={HOLO_CYAN}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* Projection glow light */}
      <pointLight position={[0, 0.28, 0.15]} intensity={0.6} color={HOLO_CYAN} distance={2.5} />
    </group>
  )
}

// ─── Wall Accent Panel — geometric lines with cyan LED strips ───────
function WallAccentPanel({ position, width, height, rotation }: {
  position: [number, number, number]
  width: number
  height: number
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main panel surface — matte white */}
      <mesh>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial color={WALL_WHITE} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Recessed geometric panel lines — subtle faceted pattern */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`panel-line-${i}`} position={[0, -height * 0.3 + i * height * 0.15, 0.009]}>
          <boxGeometry args={[width * 0.85, 0.003, 0.005]} />
          <meshStandardMaterial color="#d0d4da" roughness={0.30} />
        </mesh>
      ))}

      {/* Cyan LED strip — left */}
      <mesh position={[-width * 0.35, 0, 0.012]}>
        <boxGeometry args={[0.01, height * 0.80, 0.008]} />
        <meshStandardMaterial
          color={CYAN_ACCENT}
          emissive={CYAN_ACCENT}
          emissiveIntensity={0.8}
          roughness={0.04}
        />
      </mesh>

      {/* Cyan LED strip — right */}
      <mesh position={[width * 0.35, 0, 0.012]}>
        <boxGeometry args={[0.01, height * 0.80, 0.008]} />
        <meshStandardMaterial
          color={CYAN_ACCENT}
          emissive={CYAN_ACCENT}
          emissiveIntensity={0.8}
          roughness={0.04}
        />
      </mesh>
    </group>
  )
}

// ─── Window Wall — floor-to-ceiling glass with city view glow ───────
function WindowWall({ position, width, height, rotation }: {
  position: [number, number, number]
  width: number
  height: number
  rotation: [number, number, number]
}) {
  const windowCount = 3

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: windowCount }).map((_, i) => {
        const wx = -width * 0.30 + i * width * 0.30
        return (
          <group key={`win-${i}`} position={[wx, 0, 0]}>
            {/* Window frame — dark charcoal mullion */}
            <mesh>
              <boxGeometry args={[width * 0.25, height, 0.02]} />
              <meshStandardMaterial color="#1a1d24" metalness={0.55} roughness={0.30} />
            </mesh>
            {/* Glass pane */}
            <mesh position={[0, 0, 0.012]}>
              <planeGeometry args={[width * 0.21, height * 0.92]} />
              <meshStandardMaterial
                color="#1a3040"
                metalness={0.08}
                roughness={0.08}
                emissive={GOLDEN_HUE}
                emissiveIntensity={0.25}
                transparent
                opacity={0.55}
              />
            </mesh>
            {/* City glow reflection — warm */}
            <mesh position={[0, 0, 0.018]}>
              <planeGeometry args={[width * 0.19, height * 0.30]} />
              <meshBasicMaterial
                color={GOLDEN_HUE}
                transparent
                opacity={0.10}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Window divider — horizontal mullion */}
            <mesh position={[0, height * 0.12, 0.005]}>
              <boxGeometry args={[width * 0.25, 0.008, 0.025]} />
              <meshStandardMaterial color="#1a1d24" metalness={0.55} roughness={0.30} />
            </mesh>
          </group>
        )
      })}
      {/* Warm golden light spill from windows */}
      <pointLight position={[0, 0, 0.4]} intensity={0.8} color={GOLDEN_HUE} distance={3.5} />
    </group>
  )
}

// ─── Desk — minimalist white slab with pedestal ────────────────────
function MinimalistDesk({ position }: { position: [number, number, number] }) {
  const deskW = 1.30
  const deskD = 0.65
  const deskY = 0.38

  return (
    <group position={position}>
      {/* Desk top — thick white matte slab */}
      <mesh position={[0, deskY, 0]} castShadow receiveShadow>
        <boxGeometry args={[deskW, 0.028, deskD]} />
        <meshStandardMaterial color={DESK_WHITE} metalness={0.08} roughness={0.24} />
      </mesh>

      {/* Desk edge trim — subtle */}
      <mesh position={[0, deskY, 0]}>
        <boxGeometry args={[deskW + 0.01, 0.004, deskD + 0.01]} />
        <meshStandardMaterial color={DESK_TRIM} metalness={0.12} roughness={0.28} />
      </mesh>

      {/* Left pedestal support — thick white block */}
      <mesh position={[-deskW * 0.38, deskY * 0.42, deskD * 0.30]} castShadow>
        <boxGeometry args={[0.18, deskY * 0.82, 0.22]} />
        <meshStandardMaterial color={DESK_WHITE} metalness={0.05} roughness={0.28} />
      </mesh>

      {/* Pedestal drawers */}
      {Array.from({ length: 3 }).map((_, i) => (
        <group key={`drawer-${i}`}>
          <mesh position={[-deskW * 0.38, 0.06 + i * 0.10, deskD * 0.30 + 0.12]}>
            <boxGeometry args={[0.14, 0.07, 0.006]} />
            <meshStandardMaterial color={DESK_WHITE} metalness={0.05} roughness={0.28} />
          </mesh>
          {/* Finger pull — horizontal slot */}
          <mesh position={[-deskW * 0.38, 0.08 + i * 0.10, deskD * 0.30 + 0.123]}>
            <boxGeometry args={[0.06, 0.003, 0.004]} />
            <meshStandardMaterial color="#999" metalness={0.75} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Right leg — slim metal, floating effect */}
      <mesh position={[deskW * 0.40, deskY * 0.40, deskD * 0.22]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, deskY * 0.78, 10]} />
        <meshStandardMaterial color={DESK_LEG} metalness={0.72} roughness={0.20} />
      </mesh>
      <mesh position={[deskW * 0.40, deskY * 0.40, -deskD * 0.22]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, deskY * 0.78, 10]} />
        <meshStandardMaterial color={DESK_LEG} metalness={0.72} roughness={0.20} />
      </mesh>

      {/* Keyboard area glow */}
      <mesh position={[0.05, deskY + 0.016, deskD * 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 0.05]} />
        <meshBasicMaterial color={CYAN_ACCENT} transparent opacity={0.08} />
      </mesh>

      {/* Mouse pad */}
      <mesh position={[0.12, deskY + 0.015, deskD * 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 0.045]} />
        <meshStandardMaterial color="#1a222a" roughness={0.70} />
      </mesh>

      {/* Coffee mug — white ceramic */}
      <group position={[-0.12, deskY + 0.025, deskD * 0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.018, 0.016, 0.04, 12]} />
          <meshStandardMaterial color="#f0f0f5" roughness={0.25} />
        </mesh>
        <mesh position={[0.018, 0.005, 0]}>
          <torusGeometry args={[0.012, 0.004, 8, 8, Math.PI]} />
          <meshStandardMaterial color="#f0f0f5" roughness={0.25} />
        </mesh>
        {/* Steam wisps */}
        <mesh position={[0, 0.045, 0]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#8899bb" transparent opacity={0.06} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Ceiling Light Array — linear LED pattern ──────────────────────
function CeilingLights({ width, depth }: { width: number; depth: number }) {
  return (
    <group position={[0, 0.92, 0]}>
      {/* Central Y-shaped pattern */}
      {/* Main central spine */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.025, 0.01, depth * 0.45]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#dde4ea"
          emissiveIntensity={0.55}
          roughness={0.03}
        />
      </mesh>

      {/* Left branch */}
      <mesh position={[0, 0, -depth * 0.15]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.020, 0.01, depth * 0.18]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#dde4ea"
          emissiveIntensity={0.45}
          roughness={0.03}
        />
      </mesh>

      {/* Right branch */}
      <mesh position={[0, 0, -depth * 0.15]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.020, 0.01, depth * 0.18]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#dde4ea"
          emissiveIntensity={0.45}
          roughness={0.03}
        />
      </mesh>

      {/* Perimeter light tracks — black recessed */}
      {[-width * 0.38, width * 0.38].map((x, i) => (
        <mesh key={`plt-${i}`} position={[x, -0.005, 0]}>
          <boxGeometry args={[0.015, 0.006, depth * 0.50]} />
          <meshStandardMaterial color="#1a1d24" metalness={0.50} roughness={0.40} />
        </mesh>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Oly's Office Component
// ═══════════════════════════════════════════════════════════════════
export default function OfficeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: OfficeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const roomW = colSpan * cellW
  const roomD = rowSpan * cellD

  return (
    <group>
      {/* ═══════════════════════════════════════════════════════════
          POLISHED RESIN FLOOR — satin grey, reflective
          ═══════════════════════════════════════════════════════════ */}
      <mesh position={[cx, 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.85, roomD * 0.85]} />
        <meshStandardMaterial
          color={FLOOR_GREY}
          roughness={0.18}
          metalness={0.12}
        />
      </mesh>

      {/* Floor reflection sheen */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.80, roomD * 0.80]} />
        <meshStandardMaterial
          color="#c8d0d8"
          roughness={0.12}
          metalness={0.08}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════
          WALL ACCENT PANEL — left wall, geometric + cyan LEDs
          ═══════════════════════════════════════════════════════════ */}
      <WallAccentPanel
        position={[cx - roomW * 0.42, 0.35, cz]}
        width={0.50}
        height={0.50}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* ═══════════════════════════════════════════════════════════
          WINDOW WALL — right side, floor-to-ceiling glass
          ═══════════════════════════════════════════════════════════ */}
      <WindowWall
        position={[cx + roomW * 0.40, 0.45, cz]}
        width={roomW * 0.55}
        height={0.70}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══════════════════════════════════════════════════════════
          CEILING LIGHTS — linear LED pattern
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx, 0, cz]}>
        <CeilingLights width={roomW} depth={roomD} />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          DESK + CHAIR — main workstation
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx, 0, cz]}>
        {/* Desk */}
        <MinimalistDesk position={[0.0, 0, -roomD * 0.08]} />

        {/* Dual Monitors on desk */}
        <DualMonitors position={[0.0, 0.38, -roomD * 0.08 - 0.2]} />

        {/* Task Chair — facing monitors */}
        <TaskChair
          position={[0.0, 0, roomD * 0.22]}
          rotation={[0, Math.PI, 0]}
          color="#4a5568"
        />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          HOLOGRAPHIC DISPLAY — floating between desk and wall
          ═══════════════════════════════════════════════════════════ */}
      <HolographicDisplay position={[cx - roomW * 0.08, 0, cz - roomD * 0.15]} />

      {/* ═══════════════════════════════════════════════════════════
          FILING CABINET — corner storage
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx - roomW * 0.32, 0, cz + roomD * 0.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.10, 0.35, 0.14]} />
          <meshStandardMaterial color="#5a606a" metalness={0.35} roughness={0.38} />
        </mesh>
        {[0.07, 0.17, 0.27].map((dy, i) => (
          <mesh key={`dr-${i}`} position={[0, dy, 0.075]}>
            <boxGeometry args={[0.05, 0.006, 0.012]} />
            <meshStandardMaterial color="#aab0b8" metalness={0.70} roughness={0.22} />
          </mesh>
        ))}
      </group>

      {/* ═══════════════════════════════════════════════════════════
          POTTED PLANT — corner greenery
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx + roomW * 0.30, 0, cz + roomD * 0.32]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 10]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.70} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#3a6a30" roughness={0.75} />
        </mesh>
      </group>

      {/* ═══════════════════════════════════════════════════════════
          NEON ACCENT STRIP — subtle cyan line above desk on wall
          ═══════════════════════════════════════════════════════════ */}
      <mesh position={[cx, 0.72, cz - roomD * 0.43]}>
        <boxGeometry args={[roomW * 0.50, 0.004, 0.004]} />
        <meshStandardMaterial
          color={CYAN_ACCENT}
          emissive={CYAN_ACCENT}
          emissiveIntensity={1.0}
          roughness={0.03}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════
          ZONE LABEL — floor decal
          ═══════════════════════════════════════════════════════════ */}
      <Text
        position={[cx, 0.06, cz + roomD * 0.40]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#557799"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#080c16"
      >
        ⚙️ OLY'S OFFICE
      </Text>
    </group>
  )
}
