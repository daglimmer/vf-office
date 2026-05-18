import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Data Centre Portal — 2×3 (cols 0-1, rows 5-7) ──────────────────
// Hexagonal portal with energy vortex, TRAEFIK PROXY floating text,
// data wall displays, circuit floor patterns (file_26 reference)

interface DataCentrePortalProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// ─── Hexagonal Portal Frame ──────────────────────────────────────────
function HexPortal() {
  const frameRef = useRef<THREE.Group>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const particleRefs = useRef<THREE.Mesh[][]>([])
  
  // Generate hexagon points
  const hexRadius = 0.55
  const hexPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
      points.push(new THREE.Vector3(Math.cos(angle) * hexRadius, Math.sin(angle) * hexRadius, 0))
    }
    return points
  }, [hexRadius])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    
    // Subtle rotation of entire frame
    if (frameRef.current) {
      frameRef.current.rotation.z = Math.sin(t * 0.3) * 0.03
    }
    
    // Glow pulsation
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.25 + Math.sin(t * 1.5) * 0.1
    }
  })

  return (
    <group ref={frameRef} position={[0, 0.6, 0]}>
      {/* ─── Hexagonal frame segments ─── */}
      {hexPoints.map((p1, i) => {
        const p2 = hexPoints[(i + 1) % 6]
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)
        
        return (
          <group key={`hex-${i}`} position={[midX, midY, 0]} rotation={[0, 0, angle]}>
            {/* Main beam — thick glowing frame */}
            <mesh castShadow>
              <boxGeometry args={[length, 0.03, 0.04]} />
              <meshStandardMaterial 
                color="#39bae6" 
                emissive="#39bae6" 
                emissiveIntensity={0.6}
                roughness={0.15}
                metalness={0.6}
              />
            </mesh>
            {/* Inner glow strip */}
            <mesh position={[0, 0.005, 0.02]}>
              <boxGeometry args={[length * 0.9, 0.01, 0.008]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
            {/* Outer dark trim */}
            <mesh position={[0, -0.02, 0]}>
              <boxGeometry args={[length + 0.02, 0.015, 0.05]} />
              <meshStandardMaterial color="#0d1117" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )
      })}

      {/* ─── Corner nodes at hex vertices ─── */}
      {hexPoints.map((p, i) => (
        <mesh key={`node-${i}`} position={[p.x, p.y, 0]} castShadow>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial 
            color="#39bae6" 
            emissive="#39bae6" 
            emissiveIntensity={0.7}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
      ))}

      {/* ─── Energy vortex — inner particle sphere ─── */}
      <group>
        {/* Core glow sphere */}
        <mesh position={[0, 0, 0.02]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial
            color="#39bae6"
            emissive="#1e90ff"
            emissiveIntensity={0.8}
            roughness={0.05}
            metalness={0.05}
            transparent
            opacity={0.3}
          />
        </mesh>
        
        {/* Inner bright core */}
        <mesh position={[0, 0, 0.03]}>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>

        {/* Photon rings — concentric glowing circles */}
        {[0.3, 0.4, 0.25].map((r, ri) => (
          <mesh key={`ring-${ri}`} position={[0, 0, 0.04]}>
            <ringGeometry args={[r - 0.01, r, 48]} />
            <meshBasicMaterial 
              color={ri === 0 ? '#73d6ff' : '#39bae6'} 
              transparent 
              opacity={0.15 - ri * 0.03} 
              side={THREE.DoubleSide} 
            />
          </mesh>
        ))}

        {/* Particle stream — blue energy streaks flowing outward */}
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2
          const dist = 0.15 + (i % 3) * 0.12
          return (
            <mesh 
              key={`ps-${i}`} 
              position={[
                Math.cos(angle) * dist, 
                Math.sin(angle) * dist, 
                0.03 + (i % 4) * 0.005
              ]}
            >
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#ffffff' : '#39bae6'} transparent opacity={0.6} />
            </mesh>
          )
        })}
      </group>

      {/* ─── Glow plane behind portal ─── */}
      <mesh ref={glowRef} position={[0, 0, -0.01]}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial color="#1e90ff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* ─── Energy beams — horizontal streams from sides (file_26) ─── */}
      {[-1, 1].map((side, si) => (
        <group key={`ebeam-${si}`} position={[side * 0.6, 0, 0.05]}>
          {/* Main beam */}
          <mesh position={[side * 0.3, 0, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.02]} />
            <meshStandardMaterial color="#39bae6" emissive="#39bae6" emissiveIntensity={0.7} roughness={0.1} />
          </mesh>
          {/* Beam particles */}
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh key={`bp-${j}`} position={[side * (0.1 + j * 0.1), (Math.random() - 0.5) * 0.04, 0.015]}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#73d6ff" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Portal ambient light */}
      <pointLight position={[0, 0, 0.3]} intensity={2.5} color="#39bae6" distance={4.0} />
    </group>
  )
}

// ─── TRAEFIK PROXY Floating Text ─────────────────────────────────────
function TraefikLabel() {
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(clock.elapsedTime * 0.8) * 0.08
    }
  })

  return (
    <group position={[0, 1.15, 0.1]}>
      {/* Back glow plate */}
      <mesh ref={glowRef} position={[0, 0, -0.01]}>
        <planeGeometry args={[1.4, 0.25]} />
        <meshBasicMaterial color="#39bae6" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Main text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.15}
        color="#39bae6"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.006}
        outlineColor="#0d3b5e"
      >
        TRAEFIK PROXY
      </Text>

      {/* Underline glow */}
      <mesh position={[0, -0.1, 0.01]}>
        <boxGeometry args={[1.0, 0.006, 0.01]} />
        <meshBasicMaterial color="#39bae6" transparent opacity={0.6} />
      </mesh>

      <pointLight position={[0, 0, 0.3]} intensity={1.2} color="#39bae6" distance={2.5} />
    </group>
  )
}

// ─── Data Wall Displays ─────────────────────────────────────────────
function DataWall({ position }: { position: [number, number, number] }) {
  const screens = [
    { title: 'LATENCY', value: '0.8ms', color: '#22c55e' },
    { title: 'THROUGHPUT', value: '8.2 Gbps', color: '#39bae6' },
    { title: 'CONNS', value: '247', color: '#f59e0b' },
    { title: 'UPTIME', value: '99.99%', color: '#22c55e' },
    { title: 'NODES', value: '9/9', color: '#a78bfa' },
    { title: 'CERTS', value: 'VALID', color: '#22c55e' },
  ]

  return (
    <group position={position}>
      {/* Frame base */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 0.03]} />
        <meshStandardMaterial color="#0d1117" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Screen panels — 2×3 grid */}
      {screens.map((screen, i) => {
        const col = i % 2
        const scrRow = Math.floor(i / 2)
        const sx = (col - 0.5) * 0.42
        const sy = 0.75 - scrRow * 0.28
        
        return (
          <group key={`screen-${i}`} position={[sx, sy, 0.02]}>
            {/* Screen bezel */}
            <mesh>
              <boxGeometry args={[0.38, 0.18, 0.008]} />
              <meshStandardMaterial color="#1a1a2a" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Screen surface */}
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[0.34, 0.14]} />
              <meshStandardMaterial 
                color="#0a1628" 
                emissive={screen.color} 
                emissiveIntensity={0.3}
                roughness={0.1}
              />
            </mesh>
            {/* Title text glow bar */}
            <mesh position={[0, 0.06, 0.006]}>
              <boxGeometry args={[0.32, 0.025, 0.003]} />
              <meshBasicMaterial color={screen.color} transparent opacity={0.3} />
            </mesh>
            {/* Value glow bar at bottom */}
            <mesh position={[0, -0.04, 0.006]}>
              <boxGeometry args={[0.30, 0.03, 0.003]} />
              <meshBasicMaterial color={screen.color} transparent opacity={0.15} />
            </mesh>
          </group>
        )
      })}

      {/* Ambient glow */}
      <pointLight position={[0, 0.55, 0.3]} intensity={0.6} color="#39bae6" distance={2.0} />
    </group>
  )
}

// ─── Circuit Floor Pattern ───────────────────────────────────────────
function CircuitFloor({ width, depth }: { width: number; depth: number }) {
  const lines = useMemo(() => {
    const result: { x1: number; z1: number; x2: number; z2: number; color: string }[] = []
    // Grid of circuit-like lines
    for (let i = 0; i < 6; i++) {
      const x = (i / 5 - 0.5) * width * 0.7
      result.push({ x1: x, z1: -depth * 0.4, x2: x, z2: depth * 0.4, color: '#8b5cf6' })
    }
    for (let i = 0; i < 4; i++) {
      const z = (i / 3 - 0.5) * depth * 0.5
      result.push({ x1: -width * 0.4, z1: z, x2: width * 0.4, z2: z, color: '#8b5cf6' })
    }
    // Diagonal connections
    for (let i = 0; i < 3; i++) {
      const x = (i / 2 - 0.5) * width * 0.3
      result.push({ x1: x, z1: -depth * 0.2, x2: x + width * 0.1, z2: depth * 0.2, color: '#a78bfa' })
    }
    return result
  }, [width, depth])

  return (
    <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Base glow overlay */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#0a0a1e" />
      </mesh>
      {/* Neon circuit lines */}
      {lines.map((line, i) => {
        const mx = (line.x1 + line.x2) / 2
        const mz = (line.z1 + line.z2) / 2
        const dx = line.x2 - line.x1
        const dz = line.z2 - line.z1
        const length = Math.sqrt(dx * dx + dz * dz)
        const angle = Math.atan2(dz, dx)
        return (
          <mesh key={`cl-${i}`} position={[mx, 0.002, mz]} rotation={[0, 0, angle]}>
            <boxGeometry args={[length, 0.003, 0.003]} />
            <meshBasicMaterial color={line.color} transparent opacity={0.2} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── Data Centre Pillars ─────────────────────────────────────────────
function DataCentrePillars() {
  const pillarPositions = [
    [-1.2, -1.0], [1.2, -1.0], [-1.2, 1.0], [1.2, 1.0],
  ]

  return (
    <group>
      {pillarPositions.map(([px, pz], i) => (
        <group key={`pillar-${i}`} position={[px, 0, pz]}>
          {/* Main pillar */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[0.2, 2.0, 0.2]} />
            <meshStandardMaterial color="#1a1a2a" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* Pillar accent strip — vertical glow */}
          <mesh position={[0.11, 1.0, 0]}>
            <boxGeometry args={[0.015, 1.8, 0.015]} />
            <meshBasicMaterial color="#39bae6" transparent opacity={0.15} />
          </mesh>
          {/* Pillar base */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.24, 0.06, 0.24]} />
            <meshStandardMaterial color="#2a2a3a" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Pillar top cap */}
          <mesh position={[0, 2.02, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.24]} />
            <meshStandardMaterial color="#1a1a2a" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Pillar LED ring at base */}
          <mesh position={[0, 0.08, 0]}>
            <torusGeometry args={[0.13, 0.008, 8, 4]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function DataCentrePortal({ col, row, colSpan, rowSpan, gridCols, gridRows }: DataCentrePortalProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const zoneW = colSpan * cellW * 0.8
  const zoneD = rowSpan * cellD * 0.8

  return (
    <group position={[cx, 0, cz]}>
      {/* ─── Raised reflective floor ─── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zoneW, zoneD]} />
        <meshStandardMaterial color="#050510" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* ─── Circuit floor patterns ─── */}
      <CircuitFloor width={zoneW * 0.6} depth={zoneD * 0.5} />

      {/* ─── Pillars at corners ─── */}
      <DataCentrePillars />

      {/* ─── Hexagonal Portal — centerpiece ─── */}
      <HexPortal />

      {/* ─── TRAEFIK PROXY label — above portal ─── */}
      <TraefikLabel />

      {/* ─── Data Wall Displays — right side ─── */}
      <DataWall position={[1.0, 0, -0.2]} />

      {/* ─── Floor accent lights ─── */}
      {[-zoneW * 0.25, zoneW * 0.25].map((fx, i) => (
        <mesh key={`facclight-${i}`} position={[fx, 0.008, zoneD * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 0.015]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.15} />
        </mesh>
      ))}

      {/* "📡" floor decal */}
      <mesh position={[zoneW * 0.3, 0.03, -zoneD * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.18]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.25} />
      </mesh>
    </group>
  )
}
