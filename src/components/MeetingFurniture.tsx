import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Meeting Room — Image 2 Style: Command Center Boardroom ──────────
// T-shaped white conference table, 8 ergonomic black chairs,
// flat-screen monitors on desks, wall-mounted blueprint screens,
// floating holographic sphere, clean white/grey/black + blue neon

interface MeetingFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const TABLE_TOP = '#e8edf2'
const TABLE_EDGE = '#d0d5db'
const TABLE_LEG = '#c8cdd3'
const CHAIR_FABRIC = '#1a1c22'
const CHAIR_FRAME = '#2a2d35'
const CHAIR_BASE = '#444a52'
const MONITOR_BEZEL = '#0d0f14'
const SCREEN_CODE = '#0a1628'
const SCREEN_BLUEPRINT = '#0a1a28'
const ACCENT_BLUE = '#3b9ae6'

// ─── Floating Holographic Sphere ────────────────────────────────────
function HolographicSphere() {
  const groupRef = useRef<THREE.Group>(null!)
  const ring1Ref = useRef<THREE.Mesh>(null!)
  const ring2Ref = useRef<THREE.Mesh>(null!)
  const ring3Ref = useRef<THREE.Mesh>(null!)
  const particlesRef = useRef<THREE.Points>(null!)

  const particles = useMemo(() => {
    const count = 120
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 0.22 + Math.random() * 0.08
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.position.y = 0.85 + Math.sin(t * 0.8) * 0.05
      groupRef.current.rotation.y += 0.004
    }
    if (ring1Ref.current) ring1Ref.current.rotation.x += 0.01
    if (ring2Ref.current) ring2Ref.current.rotation.z += 0.015
    if (ring3Ref.current) ring3Ref.current.rotation.y += 0.008
    if (particlesRef.current) particlesRef.current.rotation.y += 0.003
  })

  return (
    <group ref={groupRef}>
      {/* Core sphere — translucent glass */}
      <mesh>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshPhysicalMaterial
          color="#88ccff"
          roughness={0.08}
          metalness={0.02}
          emissive="#3388cc"
          emissiveIntensity={0.5}
          transparent
          opacity={0.55}
          envMapIntensity={0.4}
          clearcoat={0.2}
        />
      </mesh>

      {/* Inner bright core */}
      <mesh>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshBasicMaterial
          color="#aaddff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial
          color="#4499dd"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbital ring 1 — horizontal */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.20, 0.008, 8, 64]} />
        <meshStandardMaterial
          color={ACCENT_BLUE}
          emissive={ACCENT_BLUE}
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Orbital ring 2 — tilted */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.5, Math.PI / 6, Math.PI / 3]}>
        <torusGeometry args={[0.22, 0.006, 8, 56]} />
        <meshBasicMaterial
          color="#66bbff"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbital ring 3 — opposite tilt */}
      <mesh ref={ring3Ref} rotation={[Math.PI / 3, -Math.PI / 4, Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.005, 6, 48]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Particle cloud */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#aaccff"
          size={0.012}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Base platform */}
      <mesh position={[0, -0.30, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 32]} />
        <meshStandardMaterial
          color="#dde4ea"
          metalness={0.15}
          roughness={0.25}
          emissive="#334455"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  )
}

// ─── Wall Blueprint Screen ──────────────────────────────────────────
function BlueprintScreen({ position, rotation, width, height }: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Screen bezel frame */}
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial color="#0d0f16" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Screen surface */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width - 0.04, height - 0.04]} />
        <meshStandardMaterial
          color={SCREEN_BLUEPRINT}
          emissive="#1a3355"
          emissiveIntensity={0.45}
          roughness={0.05}
        />
      </mesh>
      {/* Blueprint grid lines — horizontal */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`bph-${i}`} position={[0, (height * 0.3) - i * height * 0.12, 0.02]}>
          <boxGeometry args={[width - 0.12, 0.002, 0.002]} />
          <meshBasicMaterial color="#336699" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Blueprint accent circles */}
      <mesh position={[width * 0.15, height * 0.05, 0.02]}>
        <ringGeometry args={[0.04, 0.05, 32]} />
        <meshBasicMaterial color="#5599cc" transparent opacity={0.55} />
      </mesh>
      <mesh position={[width * 0.15, height * 0.05, 0.02]}>
        <ringGeometry args={[0.06, 0.065, 32]} />
        <meshBasicMaterial color="#4488bb" transparent opacity={0.35} />
      </mesh>
      {/* Blueprint text area bars */}
      {[0, 1, 2].map((i) => (
        <mesh key={`btx-${i}`} position={[-width * 0.15, height * 0.05 - i * 0.05, 0.02]}>
          <boxGeometry args={[0.08 + i * 0.01, 0.006, 0.002]} />
          <meshBasicMaterial color="#5599bb" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Thin bezel glow edge */}
      <mesh>
        <boxGeometry args={[width + 0.01, height + 0.01, 0.004]} />
        <meshBasicMaterial color="#3366aa" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

// ─── Code Screen — wall-mounted, shows scrolling code ──────────────
function CodeScreen({ position, rotation, width, height }: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Screen bezel */}
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial color="#0d0f16" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Screen surface */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width - 0.04, height - 0.04]} />
        <meshStandardMaterial
          color={SCREEN_CODE}
          emissive="#112233"
          emissiveIntensity={0.4}
          roughness={0.05}
        />
      </mesh>
      {/* Code lines — green rows */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`codeh-${i}`} position={[-(width * 0.1), height * 0.35 - i * height * 0.06, 0.02]}>
          <boxGeometry args={[0.03 + Math.random() * 0.25, 0.003, 0.001]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#44ff88' : '#22aa55'} transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Blinking cursor block */}
      <mesh position={[width * 0.18, -height * 0.2, 0.02]}>
        <boxGeometry args={[0.02, 0.02, 0.001]} />
        <meshBasicMaterial color="#44ff88" transparent opacity={0.9} />
      </mesh>
      {/* Thin bezel glow */}
      <mesh>
        <boxGeometry args={[width + 0.01, height + 0.01, 0.004]} />
        <meshBasicMaterial color="#3366aa" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

// ─── Desk Monitor — small flat-screen on the table ──────────────────
function DeskMonitor({ position, rotation, colorHint }: {
  position: [number, number, number]
  rotation: [number, number, number]
  colorHint: string
}) {
  const scrW = 0.14
  const scrH = 0.09

  return (
    <group position={position} rotation={rotation}>
      {/* Bezel */}
      <mesh castShadow>
        <boxGeometry args={[scrW, scrH, 0.008]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.45} roughness={0.15} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[scrW - 0.015, scrH - 0.015]} />
        <meshStandardMaterial color={SCREEN_BLUEPRINT} emissive={colorHint} emissiveIntensity={0.5} roughness={0.05} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -scrH / 2 - 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.01, 0.035, 8]} />
        <meshStandardMaterial color="#555a62" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Stand base */}
      <mesh position={[0, -scrH / 2 - 0.035, 0]}>
        <cylinderGeometry args={[0.02, 0.022, 0.006, 12]} />
        <meshStandardMaterial color="#444a52" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Thin glow edge */}
      <mesh>
        <boxGeometry args={[scrW + 0.003, scrH + 0.003, 0.003]} />
        <meshBasicMaterial color={colorHint} transparent opacity={0.1} />
      </mesh>
    </group>
  )
}

// ─── Ergonomic Black Chair — Image 2 style ──────────────────────────
function ErgonomicChair({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat cushion — contoured black fabric */}
      <mesh position={[0, 0.27, 0.01]} castShadow>
        <boxGeometry args={[0.18, 0.03, 0.17]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.6} />
      </mesh>
      {/* Seat front curve */}
      <mesh position={[0, 0.27, 0.10]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.03, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.6} />
      </mesh>

      {/* Backrest — ergonomic mesh back */}
      <mesh position={[0, 0.46, -0.06]} castShadow>
        <boxGeometry args={[0.16, 0.28, 0.025]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Backrest top curve */}
      <mesh position={[0, 0.60, -0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Lumbar support bulge */}
      <mesh position={[0, 0.37, -0.045]}>
        <boxGeometry args={[0.10, 0.06, 0.015]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.5} />
      </mesh>

      {/* Backrest frame — dark metal */}
      <mesh position={[0, 0.60, -0.06]}>
        <boxGeometry args={[0.18, 0.01, 0.03]} />
        <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.33, -0.06]}>
        <boxGeometry args={[0.18, 0.01, 0.03]} />
        <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Side frame posts */}
      {[-1, 1].map((s) => (
        <mesh key={`sf-${s}`} position={[s * 0.085, 0.46, -0.06]}>
          <boxGeometry args={[0.012, 0.26, 0.03]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Armrests — padded top on metal bracket */}
      {[-1, 1].map((s) => (
        <group key={`arm-${s}`}>
          <mesh position={[s * 0.085, 0.35, 0.03]} castShadow>
            <boxGeometry args={[0.018, 0.02, 0.10]} />
            <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.55} />
          </mesh>
          <mesh position={[s * 0.085, 0.30, 0.03]} castShadow>
            <boxGeometry args={[0.01, 0.07, 0.01]} />
            <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Gas lift cylinder */}
      <mesh position={[0, 0.14, 0.01]}>
        <cylinderGeometry args={[0.015, 0.018, 0.24, 10]} />
        <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.1} />
      </mesh>
      {/* Cylinder cover */}
      <mesh position={[0, 0.25, 0.01]}>
        <cylinderGeometry args={[0.025, 0.015, 0.04, 12]} />
        <meshStandardMaterial color="#444a52" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* 5-star base */}
      <mesh position={[0, 0.04, 0.01]}>
        <cylinderGeometry args={[0.055, 0.065, 0.04, 8]} />
        <meshStandardMaterial color={CHAIR_BASE} metalness={0.8} roughness={0.2} />
      </mesh>
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh
            key={`cb-${j}`}
            position={[Math.cos(rad) * 0.045, 0.045, Math.sin(rad) * 0.045 + 0.01]}
            rotation={[0, -rad, 0]}
          >
            <boxGeometry args={[0.002, 0.006, 0.07]} />
            <meshStandardMaterial color={CHAIR_BASE} metalness={0.8} roughness={0.2} />
          </mesh>
        )
      })}
      {/* Casters */}
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh
            key={`cs-${j}`}
            position={[Math.cos(rad) * 0.076, 0.018, Math.sin(rad) * 0.076 + 0.01]}
          >
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}


// ─── MAIN: Meeting Room Component ───────────────────────────────────
export default function MeetingFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: MeetingFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const zW = colSpan * cellW
  const zD = rowSpan * cellD

  // T-SHAPED TABLE dimensions
  const crossbarW = zW * 0.65    // wide part of the T
  const crossbarD = zD * 0.22    // depth of crossbar
  const stemW = zW * 0.28        // narrow stem of the T
  const stemD = zD * 0.32        // depth of stem
  const tableThickness = 0.04
  const tableY = 0.38
  const stemZ = -crossbarD / 2 - stemD / 2  // stem extends from crossbar toward back wall

  // Chair positions around T-shaped table
  const chairs = [
    // Top crossbar (front/north side) — 3 chairs
    { x: -crossbarW * 0.30, z: -crossbarD / 2 - 0.14, rot: Math.PI },
    { x: 0, z: -crossbarD / 2 - 0.14, rot: Math.PI },
    { x: crossbarW * 0.30, z: -crossbarD / 2 - 0.14, rot: Math.PI },
    // Top crossbar (back/south side) — 2 chairs
    { x: -crossbarW * 0.22, z: crossbarD / 2 + 0.14, rot: 0 },
    { x: crossbarW * 0.22, z: crossbarD / 2 + 0.14, rot: 0 },
    // Stem sides — 1 per side
    { x: -stemW / 2 - 0.14, z: stemZ - stemD * 0.1, rot: Math.PI / 2 },
    { x: stemW / 2 + 0.14, z: stemZ - stemD * 0.1, rot: -Math.PI / 2 },
    // Stem end — 1 chair
    { x: 0, z: stemZ - stemD / 2 - 0.14, rot: 0 },
  ]

  return (
    <group>
      {/* ─── Floor accent — dark polished area ─── */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.85, zD * 0.85]} />
        <meshStandardMaterial color="#121820" roughness={0.15} metalness={0.7} transparent opacity={0.5} />
      </mesh>

      {/* ─── Ceiling Light Ring — concentric neon circles ────────── */}
      {/* Outer ring */}
      <mesh position={[cx, 0.92, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.58, 64]} />
        <meshStandardMaterial
          color="#e8edf2"
          emissive="#c8d8f0"
          emissiveIntensity={0.8}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
      {/* Inner ring */}
      <mesh position={[cx, 0.925, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.40, 0.42, 48]} />
        <meshBasicMaterial color="#88aacc" transparent opacity={0.5} />
      </mesh>
      {/* Center disc light */}
      <mesh position={[cx, 0.93, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.30, 32]} />
        <meshBasicMaterial color="#ccddee" transparent opacity={0.12} />
      </mesh>

      {/* ─── T-SHAPED CONFERENCE TABLE ──────────────────────────── */}
      <group position={[cx, tableY, cz]}>
        {/* Crossbar (wide part of T) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[crossbarW, tableThickness, crossbarD]} />
          <meshStandardMaterial color={TABLE_TOP} metalness={0.08} roughness={0.2} />
        </mesh>
        {/* Crossbar edge trim */}
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[crossbarW + 0.015, 0.003, crossbarD + 0.015]} />
          <meshStandardMaterial color={TABLE_EDGE} metalness={0.15} roughness={0.25} />
        </mesh>

        {/* Stem (narrow part extending toward back wall) */}
        <mesh position={[0, 0, stemZ]} castShadow receiveShadow>
          <boxGeometry args={[stemW, tableThickness, stemD]} />
          <meshStandardMaterial color={TABLE_TOP} metalness={0.08} roughness={0.2} />
        </mesh>
        {/* Stem edge trim */}
        <mesh position={[0, 0.005, stemZ]}>
          <boxGeometry args={[stemW + 0.015, 0.003, stemD + 0.015]} />
          <meshStandardMaterial color={TABLE_EDGE} metalness={0.15} roughness={0.25} />
        </mesh>

        {/* Center connector — smooth transition between crossbar and stem */}
        <mesh position={[0, -0.002, 0]}>
          <boxGeometry args={[stemW + 0.04, 0.008, crossbarD * 0.6]} />
          <meshStandardMaterial color="#d0d5db" metalness={0.1} roughness={0.25} />
        </mesh>

        {/* Crossbar — cable management channel underneath */}
        <mesh position={[0, -0.02, -crossbarD * 0.1]}>
          <boxGeometry args={[crossbarW * 0.7, 0.015, 0.06]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.4} roughness={0.3} />
        </mesh>
      </group>

      {/* ─── TABLE LEGS — thick slab pedestals ──────────────────── */}
      {[
        // Crossbar legs
        { x: -crossbarW * 0.38, z: 0 },
        { x: crossbarW * 0.38, z: 0 },
        { x: 0, z: -crossbarD * 0.3 },
        { x: 0, z: crossbarD * 0.3 },
        // Stem legs
        { x: 0, z: stemZ + stemD * 0.3 },
        { x: 0, z: stemZ - stemD * 0.3 },
      ].map((leg, i) => (
        <mesh
          key={`tleg-${i}`}
          position={[cx + leg.x, tableY / 2, cz + leg.z]}
          castShadow
        >
          <boxGeometry args={[0.06, tableY, 0.06]} />
          <meshStandardMaterial color={TABLE_LEG} metalness={0.2} roughness={0.3} />
        </mesh>
      ))}

      {/* ─── ERGONOMIC BLACK CHAIRS ─────────────────────────────── */}
      {chairs.map((ch, i) => (
        <ErgonomicChair
          key={`ch-${i}`}
          position={[cx + ch.x, 0, cz + ch.z]}
          rotation={[0, ch.rot, 0]}
        />
      ))}

      {/* ─── DESK MONITORS — flat-screens on crossbar ──────────── */}
      {[
        { x: -crossbarW * 0.22, z: -crossbarD * 0.35, rot: 0, color: '#2255aa' },
        { x: crossbarW * 0.22, z: -crossbarD * 0.35, rot: 0, color: '#2255aa' },
        { x: 0, z: -crossbarD * 0.35, rot: 0, color: '#3366bb' },
      ].map((m, i) => (
        <DeskMonitor
          key={`dm-${i}`}
          position={[cx + m.x, tableY + 0.02, cz + m.z]}
          rotation={[0, m.rot, 0]}
          colorHint={m.color}
        />
      ))}

      {/* Keyboard glow on crossbar */}
      {[
        { x: -crossbarW * 0.22, z: -crossbarD * 0.22 },
        { x: crossbarW * 0.22, z: -crossbarD * 0.22 },
        { x: 0, z: -crossbarD * 0.22 },
      ].map((k, i) => (
        <mesh
          key={`kbg-${i}`}
          position={[cx + k.x, tableY + 0.022, cz + k.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.10, 0.035]} />
          <meshBasicMaterial color="#336699" transparent opacity={0.12} />
        </mesh>
      ))}

      {/* ─── WALL-MOUNTED BLUEPRINT SCREEN (left) ─────────────── */}
      <BlueprintScreen
        position={[cx - zW * 0.32, 0.48, cz - zD * 0.44]}
        rotation={[0, 0, 0]}
        width={0.45}
        height={0.30}
      />

      {/* ─── WALL-MOUNTED CODE SCREEN (right) ──────────────────── */}
      <CodeScreen
        position={[cx + zW * 0.32, 0.48, cz - zD * 0.44]}
        rotation={[0, 0, 0]}
        width={0.45}
        height={0.30}
      />

      {/* ─── FLOATING HOLOGRAPHIC SPHERE (right side on platform) ── */}
      <group position={[cx + zW * 0.35, 0, cz + zD * 0.20]}>
        <HolographicSphere />
        {/* Glow pool on floor */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 32]} />
          <meshBasicMaterial color="#3377cc" transparent opacity={0.1} />
        </mesh>
      </group>

      {/* ─── Neon accent strips on walls ────────────────────────── */}
      {/* Top wall strip */}
      <mesh position={[cx, 0.70, cz - zD * 0.46]}>
        <boxGeometry args={[zW * 0.65, 0.006, 0.006]} />
        <meshStandardMaterial color={ACCENT_BLUE} emissive={ACCENT_BLUE} emissiveIntensity={1.0} />
      </mesh>

      {/* "📋 MEETING ROOM" label near entrance */}
      <Text
        position={[cx + zW * 0.15, 0.08, cz + zD * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#6699bb"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#080c16"
      >
        📋 MEETING ROOM
      </Text>
    </group>
  )
}
