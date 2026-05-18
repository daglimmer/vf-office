import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SwitchBlockProps {
  position: [number, number, number]
  label: string
  portCount: number
}

function SwitchBlock({ position, label, portCount }: SwitchBlockProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const ledRefs = useRef<THREE.Mesh[]>([])

  const blinkOffsets = useMemo(() =>
    Array.from({ length: portCount }, () => Math.random() * Math.PI * 2),
    [portCount]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Switches sit solid in the rack — no floating animation
    ledRefs.current.forEach((led, i) => {
      if (led) {
        // Port LEDs blink with different patterns
        const blink = Math.sin(t * (2 + i * 0.3) + blinkOffsets[i]) > 0.0
        const mat = led.material as THREE.MeshBasicMaterial
        // Green for active, amber for occasional
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
      {/* Switch chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.08, 0.2]} />
        <meshStandardMaterial color="#1e2a3a" metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Front panel */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[0.33, 0.07]} />
        <meshStandardMaterial color="#0d1117" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Port LEDs */}
      {Array.from({ length: portCount }).map((_, i) => {
        const ledX = -0.14 + (i / (portCount - 1)) * 0.28
        return (
          <mesh
            key={i}
            ref={(el) => { if (el) ledRefs.current[i] = el }}
            position={[ledX, 0.015, 0.11]}
          >
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
          </mesh>
        )
      })}

      {/* Port numbers */}
      <mesh position={[0, -0.05, 0.11]}>
        <planeGeometry args={[0.33, 0.02]} />
        <meshBasicMaterial color="#6c7a8d" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ─── Network Closet Component ───────────────────────────────────────
interface NetworkClosetProps {
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

export default function NetworkCloset({ col, row, colSpan, rowSpan, gridCols, gridRows }: NetworkClosetProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows
  
  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  return (
    <group>
      {/* Patch panel */}
      <mesh position={[cx, 1.0, cz - 0.4]} castShadow>
        <boxGeometry args={[0.8, 0.06, 0.12]} />
        <meshStandardMaterial color="#2a3a4e" metalness={0.7} roughness={0.2} />
      </mesh>
      
      {/* Switches in a vertical rack */}
      {SWITCHES.map((sw, i) => (
        <SwitchBlock
          key={sw.label}
          position={[cx, 0.15 + i * 0.12, cz - 0.4]}
          label={sw.label}
          portCount={sw.ports}
        />
      ))}
    </group>
  )
}
