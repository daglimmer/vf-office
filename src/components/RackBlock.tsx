import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════
// Server Room — Sleek Blue-Lit Data Center Corridor (Image 33 Ref)
// ═══════════════════════════════════════════════════════════════════
// Two rows of high-density server racks facing a polished central aisle.
// Cyan/ice-blue LED edge lighting, data rain particles, reflective floor,
// industrial exposed ceiling, perforated floor grates. Professional corporate futurism.

const CORRIDOR_CYAN = '#33bbff'
const CORRIDOR_DEEP_BLUE = '#0a1a30'
const RACK_BODY = '#0d1420'
const RACK_GLASS = '#0f1d35'
const FLOOR_COLOR = '#0c1628'
const CEILING_CYAN = '#2299dd'

// ─── Individual Corridor Rack — tall, glass-fronted, cyan-framed ───
function CorridorRack({ position, rackIndex, hostCount }: {
  position: [number, number, number]
  rackIndex: number
  hostCount: number
}) {
  const ledRefs = useRef<(THREE.Mesh | null)[]>([])
  const neonLRef = useRef<THREE.Mesh>(null!)
  const neonRRef = useRef<THREE.Mesh>(null!)
  const glassRef = useRef<THREE.Mesh>(null!)

  const blinkOffsets = useMemo(() =>
    Array.from({ length: hostCount }, () => Math.random() * Math.PI * 2),
    [hostCount]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Server LED blinking behind glass
    ledRefs.current.forEach((led, i) => {
      if (led) {
        const blink = Math.sin(t * 3.5 + blinkOffsets[i]) > 0.15
        const mat = led.material as THREE.MeshBasicMaterial
        mat.opacity += ((blink ? 0.95 : 0.12) - mat.opacity) * 0.18
      }
    })
    // Neon edge pulsing
    if (neonLRef.current) {
      const pulse = 0.8 + Math.sin(t * 1.3 + rackIndex * 1.1) * 0.2
      ;[neonLRef.current, neonRRef.current].forEach(ref => {
        if (ref) {
          const m = ref.material as THREE.MeshStandardMaterial
          m.emissiveIntensity = pulse * 1.4
        }
      })
    }
    // Glass subtle shimmer
    if (glassRef.current) {
      const gm = glassRef.current.material as THREE.MeshStandardMaterial
      gm.emissiveIntensity = 0.15 + Math.sin(t * 0.8 + rackIndex * 0.5) * 0.05
    }
  })

  const rackH = 2.30
  const rackW = 0.42
  const rackD = 0.60

  return (
    <group position={position}>
      {/* ─── Rack main body — deep charcoal/blue matte ─── */}
      <mesh position={[0, rackH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[rackW, rackH, rackD]} />
        <meshStandardMaterial color={RACK_BODY} metalness={0.70} roughness={0.25} />
      </mesh>

      {/* ─── Front smoked-glass panel ─── */}
      <mesh ref={glassRef} position={[0, rackH / 2, rackD / 2 + 0.006]}>
        <boxGeometry args={[rackW * 0.88, rackH * 0.92, 0.012]} />
        <meshStandardMaterial
          color={RACK_GLASS}
          metalness={0.08}
          roughness={0.06}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={0.10}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* ─── Left neon edge strip ─── */}
      <mesh ref={neonLRef} position={[-rackW / 2 + 0.018, rackH / 2, rackD / 2 + 0.014]}>
        <boxGeometry args={[0.012, rackH * 0.90, 0.01]} />
        <meshStandardMaterial
          color={CORRIDOR_CYAN}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={1.0}
          roughness={0.04}
        />
      </mesh>

      {/* ─── Right neon edge strip ─── */}
      <mesh ref={neonRRef} position={[rackW / 2 - 0.018, rackH / 2, rackD / 2 + 0.014]}>
        <boxGeometry args={[0.012, rackH * 0.90, 0.01]} />
        <meshStandardMaterial
          color={CORRIDOR_CYAN}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={1.0}
          roughness={0.04}
        />
      </mesh>

      {/* ─── Top neon trim bar ─── */}
      <mesh position={[0, rackH - 0.02, rackD / 2 + 0.014]}>
        <boxGeometry args={[rackW * 0.90, 0.010, 0.008]} />
        <meshStandardMaterial
          color={CORRIDOR_CYAN}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={1.4}
          roughness={0.04}
        />
      </mesh>

      {/* ─── Bottom neon trim bar ─── */}
      <mesh position={[0, 0.03, rackD / 2 + 0.014]}>
        <boxGeometry args={[rackW * 0.90, 0.010, 0.008]} />
        <meshStandardMaterial
          color={CORRIDOR_CYAN}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={1.0}
          roughness={0.04}
        />
      </mesh>

      {/* ─── Server blades with LED indicators (behind glass) ─── */}
      {Array.from({ length: hostCount }).map((_, i) => {
        const y = 0.10 + ((i + 0.5) / hostCount) * rackH * 0.85
        return (
          <group key={`blade-${rackIndex}-${i}`}>
            {/* Blade faceplate */}
            <mesh position={[0, y, rackD / 2 + 0.025]}>
              <boxGeometry args={[rackW * 0.60, 0.06, 0.012]} />
              <meshStandardMaterial color="#111b2a" metalness={0.70} roughness={0.22} />
            </mesh>
            {/* Status LED — cyan */}
            <mesh
              ref={(el) => { ledRefs.current[i] = el }}
              position={[rackW * 0.22, y, rackD / 2 + 0.042]}
            >
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshBasicMaterial
                color={i < hostCount - 2 ? CORRIDOR_CYAN : '#44ccdd'}
                transparent
                opacity={0.75}
              />
            </mesh>
            {/* Activity LED — soft white */}
            <mesh position={[rackW * 0.17, y, rackD / 2 + 0.042]}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshBasicMaterial color="#aaddff" transparent opacity={0.4} />
            </mesh>
          </group>
        )
      })}

      {/* ─── Rack label plate — top, subtle ─── */}
      <mesh position={[0, rackH + 0.04, rackD / 2 + 0.010]}>
        <boxGeometry args={[rackW * 0.85, 0.030, 0.008]} />
        <meshStandardMaterial
          color={CORRIDOR_DEEP_BLUE}
          emissive={CORRIDOR_CYAN}
          emissiveIntensity={0.35}
          metalness={0.40}
          roughness={0.30}
        />
      </mesh>

      {/* ─── Side panels — reinforced edges ─── */}
      {[-1, 1].map((s) => (
        <mesh key={`side-${rackIndex}-${s}`} position={[s * (rackW / 2 + 0.008), rackH / 2, 0]}>
          <boxGeometry args={[0.010, rackH * 0.92, rackD * 0.82]} />
          <meshStandardMaterial color="#060d18" metalness={0.55} roughness={0.40} />
        </mesh>
      ))}

      {/* ─── Top ventilation grille ─── */}
      <mesh position={[0, rackH + 0.02, 0]}>
        <boxGeometry args={[rackW * 0.60, 0.022, rackD * 0.40]} />
        <meshStandardMaterial color="#0d1520" metalness={0.40} roughness={0.50} />
      </mesh>
    </group>
  )
}

// ─── Data Rain Particles — vertical cyan dots descending ───────────
function DataRain({ position, width, height, count }: {
  position: [number, number, number]
  width: number
  height: number
  count: number
}) {
  const particlesRef = useRef<THREE.Group>(null!)
  const drops = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * width,
      y: Math.random() * height,
      z: (Math.random() - 0.5) * 0.3,
      speed: 1.0 + Math.random() * 3.0,
      size: 0.004 + Math.random() * 0.010,
      alpha: 0.15 + Math.random() * 0.40,
      offset: Math.random() * Math.PI * 2,
    })),
    [count, width, height]
  )

  useFrame(({ clock }) => {
    if (!particlesRef.current) return
    const t = clock.elapsedTime
    particlesRef.current.children.forEach((child, i) => {
      const d = drops[i]
      let dy = ((t * d.speed + d.offset * height * 0.5) % (height * 1.2)) - height * 0.1
      if (dy > height) dy -= height * 1.2
      child.position.set(d.x, dy, d.z)
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = d.alpha * (0.5 + 0.5 * Math.sin(t * 3 + d.offset))
    })
  })

  return (
    <group ref={particlesRef} position={position}>
      {drops.map((d, i) => (
        <mesh key={`drop-${i}`} position={[d.x, d.y, d.z]}>
          <boxGeometry args={[d.size, d.size * 2.5, d.size]} />
          <meshBasicMaterial
            color={CORRIDOR_CYAN}
            transparent
            opacity={d.alpha}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Ceiling Light Bar — integrated into structural beam ───────────
function CeilingLightBar({ position, length, color }: {
  position: [number, number, number]
  length: number
  color: string
}) {
  return (
    <group position={position}>
      {/* Structural beam housing */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[length, 0.025, 0.08]} />
        <meshStandardMaterial color="#0a1120" metalness={0.65} roughness={0.30} />
      </mesh>
      {/* LED strip inside */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[length * 0.92, 0.008, 0.04]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.03}
        />
      </mesh>
      {/* Diffuser panel */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[length * 0.88, 0.004, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#cceeff" emissiveIntensity={0.4} roughness={0.02} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// ─── Perforated Floor Grate — at rack bases ────────────────────────
function FloorGrate({ position, width, depth }: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  return (
    <group position={position}>
      {/* Grate base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.80} roughness={0.40} />
      </mesh>
      {/* Perforation grid lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`grate-v-${i}`} position={[-width * 0.40 + i * width * 0.11, 0.003, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.012, 0.004, depth * 0.90]} />
          <meshStandardMaterial color="#2a3a4a" metalness={0.60} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Corridor Ceiling Infrastructure — exposed pipes and cable trays ──
function CorridorCeiling({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      {/* Central spine beam */}
      <mesh position={[0, 2.45, 0]} castShadow>
        <boxGeometry args={[0.08, 0.05, depth * 0.85]} />
        <meshStandardMaterial color="#0a1320" metalness={0.70} roughness={0.30} />
      </mesh>

      {/* Cable trays — transverse ribs */}
      {Array.from({ length: 6 }).map((_, i) => {
        const z = -depth * 0.35 + i * depth * 0.14
        return (
          <mesh key={`ctray-${i}`} position={[0, 2.40, z]}>
            <boxGeometry args={[width * 0.85, 0.020, 0.03]} />
            <meshStandardMaterial color="#0c1624" metalness={0.60} roughness={0.35} />
          </mesh>
        )
      })}

      {/* Ceiling light bars — 4 rows running lengthwise */}
      {[-width * 0.28, -width * 0.09, width * 0.09, width * 0.28].map((x, i) => (
        <CeilingLightBar
          key={`clb-${i}`}
          position={[x, 2.38, 0]}
          length={depth * 0.82}
          color={i < 2 ? CEILING_CYAN : '#3399cc'}
        />
      ))}

      {/* Side conduit pipes */}
      {[-width * 0.42, width * 0.42].map((x, si) => (
        <group key={`conduit-${si}`}>
          {Array.from({ length: 3 }).map((_, pi) => (
            <mesh key={`pipe-${pi}`} position={[x, 2.30 + pi * 0.05, 0]}>
              <cylinderGeometry args={[0.012, 0.012, depth * 0.80, 10]} />
              <meshStandardMaterial color="#152030" metalness={0.55} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ServerRacks — Main Server Room Component
// ═══════════════════════════════════════════════════════════════════
interface ServerRacksProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
  color: string
  zoneId: string
  facingDirection?: 'north' | 'south'
}

export function ServerRacks({ col, row, colSpan, rowSpan, gridCols, gridRows, color, zoneId, facingDirection = 'south' }: ServerRacksProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const roomW = colSpan * cellW
  const roomD = rowSpan * cellD

  const yRotation = facingDirection === 'north' ? Math.PI : 0

  // Rack positions — two rows flanking the central aisle
  const rackXOffset = roomW * 0.30
  const rackZSpacing = roomD * 0.22
  const racksPerSide = 4

  const leftRacks = Array.from({ length: racksPerSide }, (_, i) => ({
    x: -rackXOffset,
    z: -roomD * 0.42 + i * rackZSpacing,
    hosts: 5 + (i % 3),
    index: i,
  }))

  const rightRacks = Array.from({ length: racksPerSide }, (_, i) => ({
    x: rackXOffset,
    z: -roomD * 0.42 + i * rackZSpacing,
    hosts: 5 + (i % 3),
    index: i + racksPerSide,
  }))

  return (
    <group position={[cx, 0, cz]} rotation={[0, yRotation, 0]}>
      {/* ═══════════════════════════════════════════════════════════
          POLISHED REFLECTIVE FLOOR — mirror-like dark surface
          ═══════════════════════════════════════════════════════════ */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.90, roomD * 0.88]} />
        <meshStandardMaterial
          color={FLOOR_COLOR}
          roughness={0.08}
          metalness={0.92}
        />
      </mesh>

      {/* Floor reflection overlay — subtle */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.85, roomD * 0.85]} />
        <meshStandardMaterial
          color="#0a1428"
          roughness={0.05}
          metalness={0.95}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* ─── Floor tile grid lines — barely visible seams ─── */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`tile-h-${i}`} position={[0, 0.007, -roomD * 0.35 + i * roomD * 0.23]}>
          <boxGeometry args={[roomW * 0.82, 0.001, 0.002]} />
          <meshStandardMaterial color="#1a2a40" roughness={0.30} metalness={0.20} />
        </mesh>
      ))}

      {/* ═══════════════════════════════════════════════════════════
          PERFORATED FLOOR GRATES — at base of each rack row
          ═══════════════════════════════════════════════════════════ */}
      <FloorGrate
        position={[-rackXOffset, 0.008, 0]}
        width={0.48}
        depth={roomD * 0.82}
      />
      <FloorGrate
        position={[rackXOffset, 0.008, 0]}
        width={0.48}
        depth={roomD * 0.82}
      />

      {/* ═══════════════════════════════════════════════════════════
          SERVER RACKS — Left Row
          ═══════════════════════════════════════════════════════════ */}
      {leftRacks.map((rack) => (
        <CorridorRack
          key={`rack-L-${rack.index}`}
          position={[rack.x, 0, rack.z]}
          rackIndex={rack.index}
          hostCount={rack.hosts}
        />
      ))}

      {/* ═══════════════════════════════════════════════════════════
          SERVER RACKS — Right Row
          ═══════════════════════════════════════════════════════════ */}
      {rightRacks.map((rack) => (
        <CorridorRack
          key={`rack-R-${rack.index}`}
          position={[rack.x, 0, rack.z]}
          rackIndex={rack.index}
          hostCount={rack.hosts}
        />
      ))}

      {/* ═══════════════════════════════════════════════════════════
          DATA RAIN — vertical cyan particles throughout corridor
          ═══════════════════════════════════════════════════════════ */}
      <DataRain
        position={[0, 0.15, 0]}
        width={roomW * 0.55}
        height={2.10}
        count={80}
      />

      {/* ═══════════════════════════════════════════════════════════
          EXPOSED CEILING INFRASTRUCTURE
          ═══════════════════════════════════════════════════════════ */}
      <CorridorCeiling width={roomW} depth={roomD} />

      {/* ═══════════════════════════════════════════════════════════
          AMBIENT LIGHTING — cool blue pools
          ═══════════════════════════════════════════════════════════ */}
      {/* Overhead corridor lights */}
      {[-roomW * 0.15, 0, roomW * 0.15].map((lx, i) => (
        <pointLight
          key={`amb-${i}`}
          position={[lx, 2.30, 0]}
          intensity={0.6}
          color={CORRIDOR_CYAN}
          distance={3.0}
        />
      ))}

      {/* Floor-level accent glow */}
      <pointLight position={[0, 0.15, 0]} intensity={0.5} color="#1188cc" distance={3.5} />

      {/* ═══════════════════════════════════════════════════════════
          ZONE LABEL — subtle floor decal
          ═══════════════════════════════════════════════════════════ */}
      <Text
        position={[0, 0.010, roomD * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.08}
        anchorX="center"
        anchorY="middle"
        color="#336688"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#050d18"
      >
        🖥️ SERVER ROOM
      </Text>
    </group>
  )
}
