import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RackBlockProps {
  position: [number, number, number]
  label: string
  hostCount: number
  color: string
}

export default function RackBlock({ position, label, hostCount, color }: RackBlockProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const ledRefs = useRef<THREE.Mesh[]>([])
  
  const rackColor = new THREE.Color(color)
  
  const blinkOffsets = useMemo(() => 
    Array.from({ length: hostCount }, () => Math.random() * Math.PI * 2),
    [hostCount]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ledRefs.current.forEach((led, i) => {
      if (led) {
        const blink = Math.sin(t * 3 + blinkOffsets[i]) > 0.2
        const mat = led.material as THREE.MeshBasicMaterial
        mat.opacity += ((blink ? 0.9 : 0.15) - mat.opacity) * 0.15
      }
    })
  })

  const rackHeight = 2.2
  const rackWidth = 0.4
  const rackDepth = 0.6

  return (
    <group ref={groupRef} position={position}>
      {/* Rack frame — darker, more industrial */}
      <mesh position={[0, rackHeight / 2, 0]} castShadow>
        <boxGeometry args={[rackWidth, rackHeight, rackDepth]} />
        <meshStandardMaterial color={rackColor} metalness={0.75} roughness={0.25} transparent opacity={0.88} />
      </mesh>
      
      {/* Rack side panels (reinforced look) */}
      <mesh position={[-rackWidth / 2.05, rackHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.02, rackHeight * 0.95, rackDepth]} />
        <meshStandardMaterial color="#0d1117" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[rackWidth / 2.05, rackHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.02, rackHeight * 0.95, rackDepth]} />
        <meshStandardMaterial color="#0d1117" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Rack front panel (darker mesh / perforated look) */}
      <mesh position={[0, rackHeight / 2, rackDepth / 2 + 0.01]}>
        <planeGeometry args={[rackWidth * 0.88, rackHeight * 0.88]} />
        <meshStandardMaterial color="#0d1117" metalness={0.5} roughness={0.45} />
      </mesh>
      
      {/* Mesh/perforation lines on front */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[0, 0.25 + i * 0.33, rackDepth / 2 + 0.02]}>
          <boxGeometry args={[rackWidth * 0.8, 0.015, 0.005]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      {/* Server units as horizontal strips */}
      {Array.from({ length: hostCount }).map((_, i) => {
        const y = 0.22 + (i / hostCount) * rackHeight * 0.82
        return (
          <group key={i}>
            <mesh position={[0, y, rackDepth / 2 + 0.03]}>
              <boxGeometry args={[rackWidth * 0.68, 0.06, 0.02]} />
              <meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Status LED */}
            <mesh
              ref={(el) => { if (el) ledRefs.current[i] = el }}
              position={[rackWidth * 0.26, y, rackDepth / 2 + 0.05]}
            >
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial color={i < hostCount - 1 ? '#22c55e' : '#f59e0b'} transparent opacity={0.8} />
            </mesh>
            {/* Activity LED (second color) */}
            <mesh position={[rackWidth * 0.22, y, rackDepth / 2 + 0.05]}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
            </mesh>
          </group>
        )
      })}

      {/* Rack label with color accent bar */}
      <mesh position={[0, rackHeight + 0.1, 0]}>
        <boxGeometry args={[rackWidth * 1.4, 0.04, 0.1]} />
        <meshStandardMaterial color={rackColor} emissive={rackColor} emissiveIntensity={0.3} />
      </mesh>
      
      {/* Top vent grille */}
      <mesh position={[0, rackHeight + 0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[rackWidth * 0.7, 0.03, rackDepth * 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  )
}

// ─── Agent Operator Desk — small workstation in data rooms ──────────
function OperatorDesk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Small desk surface */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.28, 0.015, 0.2]} />
        <meshStandardMaterial color="#e8ecef" metalness={0.15} roughness={0.25} />
      </mesh>
      {/* Desk legs */}
      {[
        [-0.12, -0.08], [0.12, -0.08],
        [-0.12, 0.08], [0.12, 0.08],
      ].map(([lx, lz], i) => (
        <mesh key={`dl-${i}`} position={[lx, 0.16, lz]}>
          <cylinderGeometry args={[0.01, 0.012, 0.32, 8]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}

      {/* Monitor */}
      <mesh position={[0, 0.44, -0.04]} castShadow>
        <boxGeometry args={[0.14, 0.1, 0.01]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.44, -0.03]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color="#1e3a5f" emissive="#1e3a5f" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.38, -0.04]}>
        <cylinderGeometry args={[0.008, 0.01, 0.05, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Keyboard glow */}
      <mesh position={[0, 0.33, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>

      {/* Small stool — simple */}
      <mesh position={[0, 0.16, 0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.055, 0.03, 12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, 0.12]}>
        <cylinderGeometry args={[0.01, 0.012, 0.14, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Server Room Racks Component — with operator desk ───────────────
interface ServerRacksProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
  color: string
  zoneId: string
  facingDirection?: 'north' | 'south' // default: south (faces +Z)
}

export function ServerRacks({ col, row, colSpan, rowSpan, gridCols, gridRows, color, zoneId, facingDirection = 'south' }: ServerRacksProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows
  
  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  
  // Rotation: south = no rotation (faces +Z, default), north = 180° (faces -Z)
  const yRotation = facingDirection === 'north' ? Math.PI : 0
  
  const rackSpacing = colSpan < 5 ? 0.6 : 0.8
  const racks = [
    { offset: -rackSpacing, label: 'Rack A', hosts: 3 },
    { offset: 0, label: 'Rack B', hosts: 3 },
    { offset: rackSpacing, label: 'Rack C', hosts: 3 },
  ]

  // Operator desk position — offset from rack center based on facing
  const deskZ = facingDirection === 'north' ? cz + 1.2 : cz - 1.2
  const deskX = cx + rackSpacing + 0.25

  return (
    <group>
      {/* Raised floor platform */}
      <mesh position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[colSpan * cellW * 0.6, rowSpan * cellD * 0.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} transparent opacity={0.5} />
      </mesh>
      
      {/* Rack group with rotation around rack center (cx, cz) */}
      <group position={[cx, 0, cz]} rotation={[0, yRotation, 0]}>
        {racks.map((rack, i) => (
          <RackBlock
            key={i}
            position={[rack.offset, 0, 0]}
            label={rack.label}
            hostCount={rack.hosts}
            color={color}
          />
        ))}
      </group>

      {/* ─── Agent Operator Desk — small workstation ─── */}
      <OperatorDesk position={[deskX, 0, deskZ]} color={color} />
      
      {/* Cable connections between racks */}
      {racks.slice(0, -1).map((_, i) => {
        const x1 = racks[i].offset
        const x2 = racks[i + 1].offset
        const midX = (x1 + x2) / 2
        const points = [
          new THREE.Vector3(x1, 1.2, 0),
          new THREE.Vector3(midX, 1.5, 0),
          new THREE.Vector3(x2, 1.2, 0),
        ]
        const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2])
        return (
          <mesh key={`cable-${i}`} position={[cx, 0, cz]} rotation={[0, yRotation, 0]}>
            <tubeGeometry args={[curve, 20, 0.015, 6, false]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        )
      })}
      
      {/* Floor label */}
      <mesh position={[cx, 0.03, cz + (facingDirection === 'north' ? -1.1 : 1.1)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.25]} />
        <meshBasicMaterial color="#0d1117" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
