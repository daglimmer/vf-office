import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Patch Room Furniture ───────────────────────────────────────────
// cols 4-6, rows 0-1: Patch panels with switch stacks

interface PatchBlockProps {
  position: [number, number, number]
  label: string
  portCount: number
  color: string
}

function PatchPanel({ position, label, portCount, color }: PatchBlockProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const ledRefs = useRef<THREE.Mesh[]>([])

  const blinkOffsets = useMemo(() =>
    Array.from({ length: portCount }, () => Math.random() * Math.PI * 2),
    [portCount]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ledRefs.current.forEach((led, i) => {
      if (led) {
        const blink = Math.sin(t * (2 + i * 0.3) + blinkOffsets[i]) > 0.0
        const mat = led.material as THREE.MeshBasicMaterial
        const active = blink || i % 3 === 0
        if (active) {
          mat.color.set(i % 5 === 0 ? '#f59e0b' : '#22c55e')
          mat.opacity += (0.9 - mat.opacity) * 0.2
        } else {
          mat.opacity += (0.05 - mat.opacity) * 0.2
        }
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Panel chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.30, 0.08, 0.18]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Front panel */}
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[0.28, 0.07]} />
        <meshStandardMaterial color="#0d1117" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Port LEDs */}
      {Array.from({ length: portCount }).map((_, i) => {
        const ledX = -0.12 + (i / (portCount - 1)) * 0.24
        return (
          <mesh
            key={i}
            ref={(el) => { if (el) ledRefs.current[i] = el }}
            position={[ledX, 0.015, 0.1]}
          >
            <sphereGeometry args={[0.005, 6, 6]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

interface PatchRoomFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const SWITCHES = [
  { label: 'DSW-01', ports: 8 },
  { label: 'DSW-02', ports: 8 },
  { label: 'ASW-01', ports: 6 },
  { label: 'ASW-02', ports: 6 },
  { label: 'ASW-03', ports: 6 },
  { label: 'ASW-04', ports: 6 },
  { label: 'ASW-05', ports: 6 },
]

export default function PatchRoomFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: PatchRoomFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  return (
    <group>
      {/* Main patch panel rack frame */}
      <mesh position={[cx - 0.4, 0.55, cz - 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.9, 0.06]} />
        <meshStandardMaterial color="#1e2a3a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[cx + 0.4, 0.55, cz - 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.9, 0.06]} />
        <meshStandardMaterial color="#1e2a3a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Patch panels in 2 columns */}
      {Array.from({ length: 4 }).map((_, i) => (
        <PatchPanel
          key={`pp-left-${i}`}
          position={[cx - 0.15, 0.15 + i * 0.22, cz - 0.2]}
          label={`P${i + 1}L`}
          portCount={6}
          color="#f97316"
        />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <PatchPanel
          key={`pp-right-${i}`}
          position={[cx + 0.15, 0.15 + i * 0.22, cz - 0.2]}
          label={`P${i + 1}R`}
          portCount={6}
          color="#ea580c"
        />
      ))}

      {/* Switch stack (wall-mounted, right side) */}
      {SWITCHES.map((sw, i) => (
        <PatchPanel
          key={sw.label}
          position={[cx + 0.6, 0.12 + i * 0.12, cz]}
          label={sw.label}
          portCount={sw.ports}
          color="#2563eb"
        />
      ))}

      {/* Structured cabling bundle coming down */}
      {[-0.35, 0, 0.35].map((ox, i) => (
        <mesh key={`cable-${i}`} position={[cx + ox, 0.5, cz + 0.3]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
      ))}
    </group>
  )
}
