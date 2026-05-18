import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── RackBlock — Individual Server Rack (Image 1 Style) ─────────────
// Tall black cabinets with vertical blue neon strips,
// server blades with indicator lights, top signage

interface RackBlockProps {
  position: [number, number, number]
  label: string
  hostCount: number
  color: string
  rackIndex: number
}

function RackBlock({ position, label, hostCount, color, rackIndex }: RackBlockProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const ledRefs = useRef<(THREE.Mesh | null)[]>([])
  const neonRef = useRef<THREE.Mesh>(null!)

  const rackColor = new THREE.Color(color)

  const blinkOffsets = useMemo(() =>
    Array.from({ length: hostCount }, () => Math.random() * Math.PI * 2),
    [hostCount]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Server LED blinking
    ledRefs.current.forEach((led, i) => {
      if (led) {
        const blink = Math.sin(t * 3 + blinkOffsets[i]) > 0.2
        const mat = led.material as THREE.MeshBasicMaterial
        mat.opacity += ((blink ? 0.9 : 0.15) - mat.opacity) * 0.15
      }
    })
    // Neon strip pulsing
    if (neonRef.current) {
      const pulse = 0.7 + Math.sin(t * 1.5 + rackIndex * 1.2) * 0.3
      const nmat = neonRef.current.material as THREE.MeshStandardMaterial
      nmat.emissiveIntensity = pulse * 1.5
    }
  })

  const rackHeight = 2.1
  const rackWidth = 0.38
  const rackDepth = 0.58

  return (
    <group ref={groupRef} position={position}>
      {/* Rack main body — dark charcoal */}
      <mesh position={[0, rackHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[rackWidth, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#0d1117" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rack front panel — darker inset */}
      <mesh position={[0, rackHeight / 2, rackDepth / 2 + 0.005]}>
        <planeGeometry args={[rackWidth * 0.85, rackHeight * 0.9]} />
        <meshStandardMaterial color="#060a10" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* ─── Vertical neon strips — LEFT side ─── */}
      <mesh
        ref={neonRef}
        position={[-rackWidth / 2 + 0.02, rackHeight / 2, rackDepth / 2 + 0.01]}
      >
        <boxGeometry args={[0.015, rackHeight * 0.88, 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.05}
        />
      </mesh>

      {/* ─── Vertical neon strips — RIGHT side ─── */}
      <mesh position={[rackWidth / 2 - 0.02, rackHeight / 2, rackDepth / 2 + 0.01]}>
        <boxGeometry args={[0.015, rackHeight * 0.88, 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.05}
        />
      </mesh>

      {/* Mesh vent lines across front */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[0, 0.28 + i * 0.40, rackDepth / 2 + 0.02]}>
          <boxGeometry args={[rackWidth * 0.75, 0.012, 0.004]} />
          <meshStandardMaterial color="#1a1d24" metalness={0.25} roughness={0.5} />
        </mesh>
      ))}

      {/* Server blade units with indicator LEDs */}
      {Array.from({ length: hostCount }).map((_, i) => {
        const y = 0.18 + (i / hostCount) * rackHeight * 0.82
        return (
          <group key={`blade-${i}`}>
            {/* Blade faceplate */}
            <mesh position={[0, y, rackDepth / 2 + 0.025]}>
              <boxGeometry args={[rackWidth * 0.62, 0.05, 0.015]} />
              <meshStandardMaterial color="#151d28" metalness={0.75} roughness={0.2} />
            </mesh>
            {/* Status LED (green/amber) */}
            <mesh
              ref={(el) => { ledRefs.current[i] = el }}
              position={[rackWidth * 0.23, y, rackDepth / 2 + 0.042]}
            >
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshBasicMaterial
                color={i < hostCount - 1 ? '#22c55e' : '#f59e0b'}
                transparent
                opacity={0.8}
              />
            </mesh>
            {/* Activity LED (blue) */}
            <mesh position={[rackWidth * 0.18, y, rackDepth / 2 + 0.042]}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshBasicMaterial color="#66ccff" transparent opacity={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* Rack label bar at top — with neon glow */}
      <mesh position={[0, rackHeight + 0.06, rackDepth / 2 + 0.01]}>
        <boxGeometry args={[rackWidth * 1.0, 0.04, 0.015]} />
        <meshStandardMaterial
          color={rackColor}
          emissive={rackColor}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.25}
        />
      </mesh>

      {/* Top vent grille */}
      <mesh position={[0, rackHeight + 0.03, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[rackWidth * 0.65, 0.025, rackDepth * 0.45]} />
        <meshStandardMaterial color="#151a22" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Side panel detail — reinforced edges */}
      {[-1, 1].map((s) => (
        <mesh key={`side-${s}`} position={[s * (rackWidth / 2 + 0.01), rackHeight / 2, 0]}>
          <boxGeometry args={[0.015, rackHeight * 0.92, rackDepth * 0.85]} />
          <meshStandardMaterial color="#090d14" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Horizontal Data Flow Streaks ───────────────────────────────────
function DataFlows({ position, width, count }: {
  position: [number, number, number]
  width: number
  count: number
}) {
  const flowsRef = useRef<THREE.Group>(null!)
  const offsets = useMemo(() =>
    Array.from({ length: count }, () => ({
      y: 0.4 + Math.random() * 1.4,
      offset: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      length: 0.3 + Math.random() * 0.8,
      alpha: 0.15 + Math.random() * 0.25,
    })),
    [count]
  )

  useFrame(({ clock }) => {
    if (!flowsRef.current) return
    const t = clock.elapsedTime
    flowsRef.current.children.forEach((child, i) => {
      const o = offsets[i]
      const phase = (t * o.speed + o.offset) % (Math.PI * 2)
      const sx = Math.sin(phase) * width * 0.4
      child.position.x = sx
      child.position.y = o.y
      // Vary opacity to create streaming effect
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = o.alpha * (0.5 + 0.5 * Math.sin(phase * 2))
    })
  })

  return (
    <group ref={flowsRef} position={position}>
      {offsets.map((o, i) => (
        <mesh key={`df-${i}`}>
          <boxGeometry args={[o.length, 0.006, 0.004]} />
          <meshBasicMaterial
            color="#44aaff"
            transparent
            opacity={o.alpha}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}


// ─── ServerRacks — Server Room Layout (Image 1 Style) ───────────────
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

  const zW = colSpan * cellW
  const zD = rowSpan * cellD

  const yRotation = facingDirection === 'north' ? Math.PI : 0
  const rackSpacing = 0.55
  const rackCount = 3

  const racks = [
    { offset: -rackSpacing, label: 'Rack A', hosts: 5 },
    { offset: 0, label: 'Rack B', hosts: 5 },
    { offset: rackSpacing, label: 'Rack C', hosts: 3 },
  ]

  const isServerRoom = zoneId === 'server_room'
  const zoneColor = isServerRoom ? '#00aaff' : color
  const zoneLabel = isServerRoom ? 'K3S CLUSTER' : 'CLUSTER INFRA'

  return (
    <group>
      {/* ─── Raised floor platform — dark reflective ─── */}
      <mesh position={[cx, 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.65, zD * 0.55]} />
        <meshStandardMaterial color="#0a0f18" roughness={0.12} metalness={0.85} transparent opacity={0.65} />
      </mesh>

      {/* ─── Floor circuit lines reflective pattern ─── */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh
          key={`fline-${i}`}
          position={[cx, 0.013, cz + (i - 1.5) * 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[zW * 0.6, 0.003]} />
          <meshBasicMaterial color={zoneColor} transparent opacity={0.08} />
        </mesh>
      ))}

      {/* ─── Rack Group ─── */}
      <group position={[cx, 0, cz]} rotation={[0, yRotation, 0]}>
        {racks.map((rack, i) => (
          <RackBlock
            key={i}
            position={[rack.offset, 0, 0]}
            label={rack.label}
            hostCount={rack.hosts}
            color={zoneColor}
            rackIndex={i}
          />
        ))}
      </group>

      {/* ─── K3S CLUSTER Signage — large neon overhead sign ─── */}
      <group position={[cx, 2.45, cz]}>
        {/* Sign backing plate */}
        <mesh position={[0, 0, 0.3]}>
          <boxGeometry args={[2.2, 0.22, 0.03]} />
          <meshStandardMaterial color="#080c16" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Neon frame border */}
        {[
          [-1.08, 0, 0.32], [1.08, 0, 0.32],
        ].map(([fx, fy, fz], j) => (
          <mesh key={`nfv-${j}`} position={[fx, fy, fz]}>
            <boxGeometry args={[0.012, 0.20, 0.012]} />
            <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={1.5} />
          </mesh>
        ))}
        {[
          [0, 0.10, 0.32], [0, -0.10, 0.32],
        ].map(([fx, fy, fz], j) => (
          <mesh key={`nfh-${j}`} position={[fx, fy, fz]}>
            <boxGeometry args={[2.16, 0.012, 0.012]} />
            <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={1.5} />
          </mesh>
        ))}

        {/* Sign text */}
        <Text
          position={[0, 0, 0.35]}
          fontSize={0.16}
          color={zoneColor}
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.006}
          outlineColor="#0a1a2a"
        >
          {zoneLabel}
        </Text>

        {/* Glow spill light from sign */}
        <pointLight position={[0, 0, 0.6]} intensity={1.0} color={zoneColor} distance={3} />
      </group>

      {/* ─── Horizontal Data Flow Streaks — across rack fronts ─── */}
      <DataFlows position={[cx, 0, cz + 0.3]} width={zW * 0.45} count={8} />

      {/* ─── Cable bridges between racks — blue neon ─── */}
      {racks.slice(0, -1).map((_, i) => {
        const x1 = racks[i].offset
        const x2 = racks[i + 1].offset
        const midX = (x1 + x2) / 2
        const points = [
          new THREE.Vector3(x1, 1.1, 0),
          new THREE.Vector3(midX, 1.35, 0),
          new THREE.Vector3(x2, 1.1, 0),
        ]
        const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2])
        return (
          <mesh key={`cbridge-${i}`} position={[cx, 0, cz]} rotation={[0, yRotation, 0]}>
            <tubeGeometry args={[curve, 16, 0.012, 6, false]} />
            <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={0.5} />
          </mesh>
        )
      })}

      {/* ─── Floor label ─── */}
      <mesh position={[cx, 0.018, cz + (facingDirection === 'north' ? -zD * 0.38 : zD * 0.38)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.4, 0.18]} />
        <meshBasicMaterial color="#0d1117" transparent opacity={0.5} />
      </mesh>

      {/* ─── Small Operator Desk (at side) ─── */}
      <OperatorDesk
        position={[cx + zW * 0.3, 0, cz + (facingDirection === 'north' ? zD * 0.35 : -zD * 0.35)]}
        color={zoneColor}
      />

      {/* ─── Zone identifier text on floor ─── */}
      <Text
        position={[cx + zW * 0.05, 0.06, cz + zD * 0.40]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#4488aa"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#080c16"
      >
        {isServerRoom ? '🖥️ SERVER ROOM' : '📡 DATA CENTRE'}
      </Text>
    </group>
  )
}

// ─── Operator Desk — small workstation ──────────────────────────────
function OperatorDesk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.30, 0]} castShadow>
        <boxGeometry args={[0.22, 0.012, 0.16]} />
        <meshStandardMaterial color="#dde3ea" metalness={0.12} roughness={0.22} />
      </mesh>
      {[
        [-0.10, -0.07], [0.10, -0.07],
        [-0.10, 0.07], [0.10, 0.07],
      ].map(([lx, lz], i) => (
        <mesh key={`odl-${i}`} position={[lx, 0.15, lz]}>
          <cylinderGeometry args={[0.008, 0.01, 0.30, 8]} />
          <meshStandardMaterial color="#8b95a1" metalness={0.65} roughness={0.25} />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 0.41, -0.03]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.008]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.41, -0.025]}>
        <planeGeometry args={[0.10, 0.065]} />
        <meshStandardMaterial color="#1a3040" emissive="#1a3040" emissiveIntensity={0.4} roughness={0.05} />
      </mesh>
      <mesh position={[0, 0.36, -0.03]}>
        <cylinderGeometry args={[0.006, 0.008, 0.04, 8]} />
        <meshStandardMaterial color="#777" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Keyboard glow */}
      <mesh position={[0, 0.31, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
    </group>
  )
}
