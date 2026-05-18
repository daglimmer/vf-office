import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════
// Data Centre — Circular Command Room (Image 35 Ref, Redesigned)
// ═══════════════════════════════════════════════════════════════════
// Replaces hexagonal portal with: cylindrical ceiling data display,
// curved wall screens with maps/graphs, raised circular platform floor
// with glowing patterns, blue/cyan lighting. Professional infrastructure ops.

interface DataCentrePortalProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const DC_CYAN = '#00ddff'
const DC_DEEP_BLUE = '#061020'
const DC_BG = '#040e1e'
const DC_FLOOR = '#0a1224'
const DC_PLATFORM = '#0c162a'

// ─── Circular Floor Platform — raised dais with concentric rings ───
function CircularPlatform() {
  const ringRefs = useRef<THREE.Mesh[]>([])
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0.15 + Math.sin(t * 1.2 + i * 0.6) * 0.08
      }
    })
    if (glowRef.current) {
      const gm = glowRef.current.material as THREE.MeshStandardMaterial
      gm.emissiveIntensity = 0.25 + Math.sin(t * 0.7) * 0.08
    }
  })

  return (
    <group>
      {/* Base platform disc — raised dark reflective */}
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.65, 0.68, 0.03, 48]} />
        <meshStandardMaterial color={DC_PLATFORM} metalness={0.85} roughness={0.10} />
      </mesh>

      {/* Step ring — slight elevation change */}
      <mesh position={[0, 0.038, 0]}>
        <torusGeometry args={[0.60, 0.018, 16, 64]} />
        <meshStandardMaterial color="#0f1e3a" metalness={0.70} roughness={0.18} />
      </mesh>

      {/* Inner platform — slightly raised */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.50, 0.52, 0.02, 48]} />
        <meshStandardMaterial color={DC_PLATFORM} metalness={0.80} roughness={0.12} />
      </mesh>

      {/* ─── Concentric illuminated rings ─── */}
      {[0.55, 0.47, 0.38, 0.28].map((r, i) => (
        <mesh
          key={`cring-${i}`}
          ref={(el) => { ringRefs.current[i] = el! }}
          position={[0, 0.056, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[r - 0.008, r, 64]} />
          <meshBasicMaterial
            color={DC_CYAN}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ─── Radial circuit lines — spokes from center ─── */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const length = 0.42
        return (
          <mesh
            key={`radial-${i}`}
            position={[
              Math.cos(angle) * length * 0.5,
              0.052,
              Math.sin(angle) * length * 0.5,
            ]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <boxGeometry args={[length, 0.003, 0.003]} />
            <meshBasicMaterial
              color={DC_CYAN}
              transparent
              opacity={0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* ─── Node dots at ring intersections ─── */}
      {[0.55, 0.47, 0.38, 0.28].map((r, ri) => (
        Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + ri * 0.3
          return (
            <mesh
              key={`pnode-${ri}-${i}`}
              position={[
                Math.cos(angle) * r,
                0.057,
                Math.sin(angle) * r,
              ]}
            >
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial
                color={ri === 0 ? '#ffffff' : DC_CYAN}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )
        })
      ))}

      {/* Core glow at center */}
      <mesh ref={glowRef} position={[0, 0.058, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.01, 24]} />
        <meshStandardMaterial
          color={DC_CYAN}
          emissive={DC_CYAN}
          emissiveIntensity={0.30}
          roughness={0.05}
          metalness={0.20}
        />
      </mesh>

      {/* Platform ambient light */}
      <pointLight position={[0, 0.15, 0]} intensity={0.8} color={DC_CYAN} distance={3.0} />
    </group>
  )
}

// ─── Cylindrical Ceiling Display — suspended data tower ────────────
function CylindricalCeilingDisplay() {
  const cylinderRef = useRef<THREE.Group>(null!)
  const dataRingRefs = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (cylinderRef.current) {
      cylinderRef.current.rotation.y = Math.sin(t * 0.15) * 0.03
    }
    dataRingRefs.current.forEach((ring, i) => {
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0.15 + Math.sin(t * 1.8 + i * 0.5) * 0.06
      }
    })
  })

  const rings = [
    { y: -0.20, label: 'THROUGHPUT', value: '8.2 Gbps' },
    { y: -0.08, label: 'NODES', value: '9 ACTIVE' },
    { y: 0.04, label: 'LATENCY', value: '0.8ms' },
    { y: 0.16, label: 'UPTIME', value: '99.99%' },
    { y: 0.28, label: 'ALERTS', value: '0 CRITICAL' },
  ]

  return (
    <group ref={cylinderRef} position={[0, 2.10, 0]}>
      {/* Central shaft — dark metal core */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.60, 16]} />
        <meshStandardMaterial color="#0a1220" metalness={0.70} roughness={0.28} />
      </mesh>

      {/* ─── Data rings stacked along cylinder ─── */}
      {rings.map((ring, i) => (
        <group key={`dring-${i}`} position={[0, ring.y, 0]}>
          {/* Ring frame */}
          <mesh
            ref={(el) => { dataRingRefs.current[i] = el! }}
          >
            <torusGeometry args={[0.22, 0.01, 8, 48]} />
            <meshBasicMaterial
              color={DC_CYAN}
              transparent
              opacity={0.18}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Ring band — emissive */}
          <mesh>
            <ringGeometry args={[0.21, 0.23, 48]} />
            <meshBasicMaterial
              color={DC_CYAN}
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Data label text on ring */}
          <Text
            position={[0.26, 0, 0]}
            fontSize={0.06}
            anchorX="left"
            anchorY="middle"
            color="#55cccc"
            font="/fonts/Inter-Bold.ttf"
            outlineWidth={0.004}
            outlineColor="#040810"
          >
            {ring.label}
          </Text>

          {/* Value text */}
          <Text
            position={[-0.26, -0.06, 0]}
            fontSize={0.05}
            anchorX="right"
            anchorY="middle"
            color="#88ddff"
            font="/fonts/Inter-Bold.ttf"
            outlineWidth={0.003}
            outlineColor="#040810"
          >
            {ring.value}
          </Text>

          {/* Small indicator dot */}
          <mesh position={[Math.cos(Math.PI * 0.3) * 0.22, 0, Math.sin(Math.PI * 0.3) * 0.22]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshBasicMaterial
              color={i < 4 ? '#44ff88' : '#ffaa44'}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Top cap — glowing halo */}
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.25, 0.015, 8, 48]} />
        <meshStandardMaterial
          color={DC_CYAN}
          emissive={DC_CYAN}
          emissiveIntensity={0.7}
          roughness={0.05}
        />
      </mesh>

      {/* Top glow disc */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.26, 0.28, 0.01, 32]} />
        <meshBasicMaterial
          color={DC_CYAN}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Bottom mounting ring */}
      <mesh position={[0, -0.24, 0]}>
        <torusGeometry args={[0.18, 0.012, 8, 48]} />
        <meshStandardMaterial color="#0a1220" metalness={0.75} roughness={0.22} />
      </mesh>

      {/* Ceiling mount rods */}
      {[0, Math.PI * 0.66, Math.PI * 1.33].map((angle, i) => (
        <mesh
          key={`mount-${i}`}
          position={[
            Math.cos(angle) * 0.14,
            0.30,
            Math.sin(angle) * 0.14,
          ]}
        >
          <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
          <meshStandardMaterial color="#1a2a3a" metalness={0.65} roughness={0.30} />
        </mesh>
      ))}

      {/* Ceiling display ambient light */}
      <pointLight position={[0, 0, 0]} intensity={1.2} color={DC_CYAN} distance={3.5} />
    </group>
  )
}

// ─── Curved Wall Screen Array — maps, graphs, dashboards ───────────
function WallScreenArray({ position, radius, arcStart, arcEnd, height }: {
  position: [number, number, number]
  radius: number
  arcStart: number
  arcEnd: number
  height: number
}) {
  const screens = 8
  const arcLength = arcEnd - arcStart

  const screenData = useMemo(() => [
    { label: 'NETWORK MAP', type: 'map', color: '#22aa66' },
    { label: 'TRAFFIC', type: 'graph', color: '#33bbff' },
    { label: 'STORAGE', type: 'chart', color: '#ff9944' },
    { label: 'ALERTS', type: 'status', color: '#ff4466' },
    { label: 'PERFORMANCE', type: 'graph', color: '#44cc88' },
    { label: 'TOPOLOGY', type: 'map', color: '#8866ff' },
    { label: 'LOGS', type: 'text', color: '#66aaee' },
    { label: 'HEALTH', type: 'status', color: '#44dd88' },
  ], [])

  const screenRefs = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    screenRefs.current.forEach((screen, i) => {
      if (screen) {
        const mat = screen.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.35 + Math.sin(t * 0.8 + i * 0.7) * 0.08
      }
    })
  })

  return (
    <group position={position}>
      {Array.from({ length: screens }).map((_, i) => {
        const angle = arcStart + (i / (screens - 1)) * arcLength
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const facingAngle = angle
        const sd = screenData[i % screenData.length]

        return (
          <group
            key={`screen-${i}`}
            position={[x, height * 0.55, z]}
            rotation={[0, facingAngle, 0]}
          >
            {/* Screen frame — dark brushed metal */}
            <mesh>
              <boxGeometry args={[0.22, 0.30, 0.015]} />
              <meshStandardMaterial color="#0a121e" metalness={0.60} roughness={0.28} />
            </mesh>

            {/* Screen surface — emissive data */}
            <mesh
              ref={(el) => { screenRefs.current[i] = el! }}
              position={[0, 0, 0.009]}
            >
              <planeGeometry args={[0.19, 0.27]} />
              <meshStandardMaterial
                color="#061020"
                emissive={sd.color}
                emissiveIntensity={0.35}
                roughness={0.04}
              />
            </mesh>

            {/* Screen content bars */}
            {sd.type === 'graph' && Array.from({ length: 5 }).map((_, j) => (
              <mesh key={`bar-${i}-${j}`} position={[-0.06 + j * 0.03, -0.05 + Math.random() * 0.12, 0.016]}>
                <boxGeometry args={[0.018, 0.04 + Math.random() * 0.08, 0.002]} />
                <meshBasicMaterial color={sd.color} transparent opacity={0.6} />
              </mesh>
            ))}
            {sd.type === 'map' && (
              <>
                <mesh position={[0, 0.02, 0.016]} rotation={[0, 0, 0]}>
                  <ringGeometry args={[0.04, 0.055, 24]} />
                  <meshBasicMaterial color={sd.color} transparent opacity={0.35} />
                </mesh>
                {Array.from({ length: 6 }).map((_, j) => {
                  const a = (j / 6) * Math.PI * 2
                  return (
                    <mesh key={`node-${i}-${j}`} position={[Math.cos(a) * 0.045, Math.sin(a) * 0.045 + 0.02, 0.016]}>
                      <sphereGeometry args={[0.008, 4, 4]} />
                      <meshBasicMaterial color={sd.color} transparent opacity={0.6} />
                    </mesh>
                  )
                })}
              </>
            )}
            {sd.type === 'status' && Array.from({ length: 4 }).map((_, j) => (
              <mesh key={`stat-${i}-${j}`} position={[0, 0.08 - j * 0.05, 0.016]}>
                <boxGeometry args={[0.12, 0.012, 0.002]} />
                <meshBasicMaterial color={sd.color} transparent opacity={0.3 + j * 0.05} />
              </mesh>
            ))}

            {/* Screen label */}
            <mesh position={[0, -0.15, 0.012]}>
              <boxGeometry args={[0.18, 0.015, 0.004]} />
              <meshBasicMaterial color={sd.color} transparent opacity={0.2} />
            </mesh>

            {/* Cyan edge frame */}
            <mesh>
              <boxGeometry args={[0.23, 0.31, 0.003]} />
              <meshBasicMaterial color={DC_CYAN} transparent opacity={0.06} />
            </mesh>

            {/* Small status LED */}
            <mesh position={[0.10, 0.14, 0.012]}>
              <sphereGeometry args={[0.005, 4, 4]} />
              <meshBasicMaterial
                color={i < 7 ? '#44ff88' : '#ff8844'}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        )
      })}

      {/* Continuous curved band connecting screens */}
      <mesh position={[0, height * 0.08, 0]}>
        <torusGeometry args={[radius, 0.006, 8, 64, arcLength]} />
        <meshBasicMaterial color={DC_CYAN} transparent opacity={0.1} />
      </mesh>
      <mesh position={[0, height * 0.90, 0]}>
        <torusGeometry args={[radius, 0.006, 8, 64, arcLength]} />
        <meshBasicMaterial color={DC_CYAN} transparent opacity={0.1} />
      </mesh>
    </group>
  )
}

// ─── Corner Pillars — structural columns ────────────────────────────
function CornerPillar({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.10, height, 0.10]} />
        <meshStandardMaterial color="#0a1220" metalness={0.45} roughness={0.45} />
      </mesh>
      {/* Cyan accent strip */}
      <mesh position={[0.055, height / 2, 0]}>
        <boxGeometry args={[0.008, height * 0.85, 0.008]} />
        <meshBasicMaterial color={DC_CYAN} transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Data Centre Component
// ═══════════════════════════════════════════════════════════════════
export default function DataCentrePortal({ col, row, colSpan, rowSpan, gridCols, gridRows }: DataCentrePortalProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const roomW = colSpan * cellW
  const roomD = rowSpan * cellD

  return (
    <group position={[cx, 0, cz]}>
      {/* ═══════════════════════════════════════════════════════════
          DARK REFLECTIVE FLOOR
          ═══════════════════════════════════════════════════════════ */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.88, roomD * 0.88]} />
        <meshStandardMaterial
          color={DC_BG}
          roughness={0.08}
          metalness={0.90}
        />
      </mesh>

      {/* Floor reflection enhancement */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.82, roomD * 0.82]} />
        <meshStandardMaterial
          color={DC_FLOOR}
          roughness={0.06}
          metalness={0.92}
          transparent
          opacity={0.60}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════
          CIRCULAR PLATFORM — centerpiece of the room
          ═══════════════════════════════════════════════════════════ */}
      <CircularPlatform />

      {/* ═══════════════════════════════════════════════════════════
          CYLINDRICAL CEILING DISPLAY — suspended data tower
          ═══════════════════════════════════════════════════════════ */}
      <CylindricalCeilingDisplay />

      {/* ═══════════════════════════════════════════════════════════
          CURVED WALL SCREEN ARRAYS — perimeter monitoring displays
          ═══════════════════════════════════════════════════════════ */}
      {/* Back wall screens (curved, behind platform) */}
      <WallScreenArray
        position={[0, 0.10, -roomD * 0.12]}
        radius={0.75}
        arcStart={-Math.PI * 0.55}
        arcEnd={Math.PI * 0.55}
        height={0.85}
      />

      {/* Side wall screens (left flank) */}
      <WallScreenArray
        position={[-0.45, 0.10, roomD * 0.05]}
        radius={0.55}
        arcStart={-Math.PI * 0.7}
        arcEnd={-Math.PI * 0.15}
        height={0.70}
      />

      {/* Side wall screens (right flank) */}
      <WallScreenArray
        position={[0.45, 0.10, roomD * 0.05]}
        radius={0.55}
        arcStart={Math.PI * 0.15}
        arcEnd={Math.PI * 0.7}
        height={0.70}
      />

      {/* ═══════════════════════════════════════════════════════════
          CORNER PILLARS — structural framing
          ═══════════════════════════════════════════════════════════ */}
      <CornerPillar position={[-roomW * 0.38, 0, -roomD * 0.38]} height={0.95} />
      <CornerPillar position={[roomW * 0.38, 0, -roomD * 0.38]} height={0.95} />
      <CornerPillar position={[-roomW * 0.38, 0, roomD * 0.38]} height={0.95} />
      <CornerPillar position={[roomW * 0.38, 0, roomD * 0.38]} height={0.95} />

      {/* ═══════════════════════════════════════════════════════════
          AMBIENT LIGHTING
          ═══════════════════════════════════════════════════════════ */}
      {/* Ceiling ambient point lights */}
      <pointLight position={[0, 2.00, 0]} intensity={0.8} color={DC_CYAN} distance={4.5} />
      <pointLight position={[-0.3, 1.50, 0.2]} intensity={0.5} color="#0088cc" distance={3.0} />
      <pointLight position={[0.3, 1.50, -0.2]} intensity={0.5} color="#0088cc" distance={3.0} />

      {/* Floor accent lights at edges */}
      <pointLight position={[-roomW * 0.35, 0.1, 0]} intensity={0.4} color={DC_CYAN} distance={2.5} />
      <pointLight position={[roomW * 0.35, 0.1, 0]} intensity={0.4} color={DC_CYAN} distance={2.5} />

      {/* ═══════════════════════════════════════════════════════════
          ZONE LABEL — floor decal
          ═══════════════════════════════════════════════════════════ */}
      <Text
        position={[0, 0.010, roomD * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#3388aa"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#040810"
      >
        📡 DATA CENTRE
      </Text>
    </group>
  )
}
