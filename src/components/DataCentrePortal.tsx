import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Data Centre Command Center — Image 35 Reference ──────────────────
// Circular command room: central cylindrical display tower with dense UI,
// raised holographic floor dais with concentric glowing rings,
// perimeter console ring, wall-mounted screen banks,
// dramatic concentric ceiling rings with cyan neon lighting

interface DataCentrePortalProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// ─── Circular Floor Dais — raised platform with concentric glowing tiers ──
function CommandDais({ radius, position }: { radius: number; position: [number, number, number] }) {
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = 0.70 + Math.sin(clock.elapsedTime * 0.8) * 0.15
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = pulse * 0.22
    }
  })

  return (
    <group position={position}>
      {/* Base tier — wide dark circle */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 0.04, 48]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.7} roughness={0.15} />
      </mesh>

      {/* Mid tier — slightly raised */}
      <mesh position={[0, 0.10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.78, radius * 0.80, 0.03, 48]} />
        <meshStandardMaterial color="#1e222a" metalness={0.75} roughness={0.12} />
      </mesh>

      {/* Inner tier — central command surface */}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.55, radius * 0.57, 0.02, 48]} />
        <meshStandardMaterial color="#22262e" metalness={0.8} roughness={0.10} />
      </mesh>

      {/* Cyan edge ring — outer tier */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius, 64]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan edge ring — mid tier */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.77, radius * 0.80, 64]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan edge ring — inner tier */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.54, radius * 0.57, 64]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Radial circuit lines — emanating from center */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        return (
          <mesh
            key={`radial-${i}`}
            position={[0, 0.042, 0]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.003, 0.001, radius * 0.85]} />
            <meshBasicMaterial color="#00aaff" transparent opacity={0.2} />
          </mesh>
        )
      })}

      {/* Concentric data rings on dais surface */}
      {[0.25, 0.40, 0.55].map((r, ri) => (
        <mesh key={`dring-${ri}`} position={[0, 0.045 + ri * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * r - 0.002, radius * r, 64]} />
          <meshBasicMaterial color="#3388cc" transparent opacity={0.18 - ri * 0.04} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Central glow disc */}
      <mesh ref={glowRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.30, 48]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─── Central Cylindrical Display Tower — multi-sided UI pillar ──────
function CentralDisplayTower({ position }: { position: [number, number, number] }) {
  const towerRef = useRef<THREE.Group>(null!)
  const towerHeight = 2.0
  const towerRadius = 0.42

  // Generate cylindrical display panels
  const panelCount = 8
  const panelAngle = (Math.PI * 2) / panelCount

  const panels = useMemo(() =>
    Array.from({ length: panelCount }, (_, i) => {
      const angle = i * panelAngle
      return {
        x: Math.cos(angle) * (towerRadius + 0.005),
        z: Math.sin(angle) * (towerRadius + 0.005),
        rot: angle + Math.PI / 2,
      }
    }),
    [panelCount, panelAngle, towerRadius]
  )

  useFrame(({ clock }) => {
    if (towerRef.current) {
      // Very slow rotation
      towerRef.current.rotation.y += 0.0003
    }
  })

  return (
    <group ref={towerRef} position={position}>
      {/* Tower core — dark metal cylinder */}
      <mesh position={[0, towerHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[towerRadius, towerRadius, towerHeight, 32]} />
        <meshStandardMaterial color="#0d111a" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* Display panels wrapping the cylinder */}
      {panels.map((panel, i) => (
        <group key={`dp-${i}`} position={[panel.x, towerHeight / 2, panel.z]} rotation={[0, panel.rot, 0]}>
          {/* Panel frame */}
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[0.30, towerHeight * 0.88]} />
            <meshStandardMaterial color="#0a0f1a" metalness={0.5} roughness={0.2} />
          </mesh>

          {/* UI Content — data columns */}
          {Array.from({ length: 8 }).map((_, r) => (
            <mesh key={`row-${r}`} position={[-0.08, towerHeight * 0.38 - r * towerHeight * 0.10, 0.005]}>
              <boxGeometry args={[0.03 + Math.random() * 0.10, 0.004, 0.001]} />
              <meshBasicMaterial color={r < 3 ? '#22dd88' : r < 6 ? '#44aadd' : '#cc8844'} transparent opacity={0.7} />
            </mesh>
          ))}

          {/* Small data dots */}
          {Array.from({ length: 12 }).map((_, d) => (
            <mesh key={`dot-${d}`} position={[
              (Math.random() - 0.5) * 0.22,
              towerHeight * 0.42 - d * towerHeight * 0.07,
              0.006,
            ]}>
              <sphereGeometry args={[0.004, 6, 6]} />
              <meshBasicMaterial color={d % 3 === 0 ? '#ff6644' : '#00ccff'} transparent opacity={0.8} />
            </mesh>
          ))}

          {/* Circular gauge widget */}
          <mesh position={[0.08, -towerHeight * 0.30, 0.006]}>
            <ringGeometry args={[0.025, 0.030, 24, 1, 0, Math.PI * 1.7]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.08, -towerHeight * 0.30, 0.007]}>
            <ringGeometry args={[0.018, 0.023, 24]} />
            <meshBasicMaterial color="#3388cc" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>

          {/* Panel edge glow */}
          <mesh position={[0, 0, 0.003]}>
            <boxGeometry args={[0.32, towerHeight * 0.90, 0.004]} />
            <meshBasicMaterial color="#00aaff" transparent opacity={0.12} />
          </mesh>
        </group>
      ))}

      {/* Top cap — glowing ring */}
      <mesh position={[0, towerHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[towerRadius - 0.02, towerRadius + 0.03, 48]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Bottom cap ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[towerRadius - 0.04, towerRadius + 0.01, 48]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Tower light source */}
      <pointLight position={[0, towerHeight / 2, 0]} intensity={0.8} color="#00aaff" distance={4} />
    </group>
  )
}

// ─── Ceiling Ring Structure — dramatic concentric overhead canopy ───
function CeilingRings({ position, radius }: { position: [number, number, number]; radius: number }) {
  const innerGlowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (innerGlowRef.current) {
      const pulse = 0.55 + Math.sin(clock.elapsedTime * 0.6) * 0.12
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = pulse * 0.45
    }
  })

  return (
    <group position={position}>
      {/* Outer structural ring — dark metal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.06, radius + 0.04, 64]} />
        <meshStandardMaterial color="#0d111a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Mid ring */}
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.72 - 0.05, radius * 0.72 + 0.03, 64]} />
        <meshStandardMaterial color="#0a0f18" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Inner ring */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.45 - 0.04, radius * 0.45 + 0.02, 48]} />
        <meshStandardMaterial color="#060a14" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Cyan neon outer ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.01, radius + 0.01, 64]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan neon mid ring */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.71, radius * 0.73, 64]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan neon inner ring */}
      <mesh ref={innerGlowRef} position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.44, radius * 0.46, 48]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Radial struts connecting rings */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={`strut-${i}`}
            position={[0, -0.04, 0]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.015, 0.015, radius * 0.5]} />
            <meshStandardMaterial color="#1a1d26" metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}

      {/* Downward point lights from ceiling rings */}
      {[0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 2, Math.PI * 7 / 4].map((a, i) => (
        <pointLight
          key={`clight-${i}`}
          position={[Math.cos(a) * radius * 0.6, -0.15, Math.sin(a) * radius * 0.6]}
          intensity={0.3}
          color="#00aaff"
          distance={3}
        />
      ))}
    </group>
  )
}

// ─── Wall Screen Bank — large display panels on perimeter walls ─────
function WallScreenBank({ position, rotation, size }: {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main frame */}
      <mesh castShadow>
        <boxGeometry args={[size[0], size[1], 0.015]} />
        <meshStandardMaterial color="#0a0f18" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Screen surface — main */}
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[size[0] - 0.04, size[1] - 0.04]} />
        <meshStandardMaterial
          color="#0a1a30"
          emissive="#0d2040"
          emissiveIntensity={0.5}
          roughness={0.04}
        />
      </mesh>

      {/* UI elements — data map/grid */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`wbar-${i}`} position={[
          (i - 2.5) * 0.08,
          size[1] * 0.15,
          0.010,
        ]}>
          <boxGeometry args={[0.04, 0.003 + i * 0.005, 0.001]} />
          <meshBasicMaterial color={i < 3 ? '#22dd88' : '#44aadd'} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Grid lines */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`wgl-${i}`} position={[0, size[1] * 0.25 - i * size[1] * 0.18, 0.010]}>
          <boxGeometry args={[size[0] * 0.7, 0.001, 0.001]} />
          <meshBasicMaterial color="#335577" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Circular widgets */}
      {[-size[0] * 0.3, size[0] * 0.3].map((cx, ci) => (
        <group key={`cw-${ci}`} position={[cx, -size[1] * 0.2, 0.010]}>
          <mesh>
            <ringGeometry args={[0.025, 0.030, 24]} />
            <meshBasicMaterial color={ci === 0 ? '#44ccff' : '#22ff88'} transparent opacity={0.6} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.015, 0.020, 16, 1, 0, Math.PI * 1.3]} />
            <meshBasicMaterial color="#88ddff" transparent opacity={0.4} />
          </mesh>
        </group>
      ))}

      {/* Thin cyan frame glow */}
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[size[0] - 0.01, size[1] - 0.01, 0.003]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.1} />
      </mesh>
    </group>
  )
}

// ─── Console Station — perimeter operator desk ──────────────────────
function ConsoleStation({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Console body — angled desk */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.40, 0.10, 0.25]} />
        <meshStandardMaterial color="#0d111a" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Console top surface — angled */}
      <mesh position={[0, 0.34, -0.05]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.015, 0.20]} />
        <meshStandardMaterial color="#1a1d26" metalness={0.6} roughness={0.18} />
      </mesh>
      {/* Embedded display on console */}
      <mesh position={[0, 0.36, -0.06]} rotation={[0.25, 0, 0]}>
        <planeGeometry args={[0.30, 0.12]} />
        <meshStandardMaterial
          color="#0a1a30"
          emissive="#0d2040"
          emissiveIntensity={0.4}
          roughness={0.05}
        />
      </mesh>
      {/* Data lines on console display */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`cdl-${i}`} position={[-0.08, 0.38 + i * 0.015, -0.055]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.04 + i * 0.06, 0.002, 0.001]} />
          <meshBasicMaterial color={i === 0 ? '#22dd88' : '#44aadd'} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Console edge glow */}
      <mesh position={[0, 0.34, -0.05]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.40, 0.018, 0.22]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.08} />
      </mesh>
      {/* Indicator lights */}
      {[-0.15, 0, 0.15].map((ox, li) => (
        <mesh key={`ind-${li}`} position={[ox, 0.34, 0.05]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <meshBasicMaterial color={li === 0 ? '#44ff88' : li === 1 ? '#ffaa44' : '#44ccff'} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Reflective Floor with Circuit Patterns ─────────────────────────
function CommandFloor({ position, size }: {
  position: [number, number, number]
  size: [number, number]
}) {
  return (
    <group position={position}>
      {/* Main reflective dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial color="#0a0f18" roughness={0.08} metalness={0.95} />
      </mesh>

      {/* Concentric floor rings */}
      {[0.6, 1.0, 1.4].map((r, ri) => (
        <mesh key={`cfr-${ri}`} position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.008, r, 64]} />
          <meshBasicMaterial color="#1a3366" transparent opacity={0.25 - ri * 0.06} />
        </mesh>
      ))}

      {/* Radial lines from center */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={`crl-${i}`}
            position={[0, 0.007, 0]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <boxGeometry args={[0.002, 0.001, 1.3]} />
            <meshBasicMaterial color="#224488" transparent opacity={0.15} />
          </mesh>
        )
      })}

      {/* Grid dots at intersections */}
      {Array.from({ length: 4 }).map((_, ri) => {
        const r = 0.3 + ri * 0.25
        return Array.from({ length: 8 }).map((_, ai) => {
          const a = (ai / 8) * Math.PI * 2
          return (
            <mesh key={`gdot-${ri}-${ai}`} position={[Math.cos(a) * r, 0.008, Math.sin(a) * r]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial color="#3366aa" transparent opacity={0.3} />
            </mesh>
          )
        })
      })}
    </group>
  )
}


// ─── MAIN: Data Centre Command Center ───────────────────────────────
export default function DataCentrePortal({ col, row, colSpan, rowSpan, gridCols, gridRows }: DataCentrePortalProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const zW = colSpan * cellW
  const zD = rowSpan * cellD
  const roomRadius = Math.min(zW, zD) * 0.42

  return (
    <group position={[cx, 0, cz]}>
      {/* ─── Command Floor — dark reflective with circuit patterns ─── */}
      <CommandFloor position={[0, 0, 0]} size={[zW * 0.75, zD * 0.75]} />

      {/* ─── Central Command Dais — raised circular holographic platform ─── */}
      <CommandDais radius={roomRadius * 0.65} position={[0, 0, 0]} />

      {/* ─── Central Cylindrical Display Tower ─── */}
      <CentralDisplayTower position={[0, 0, 0]} />

      {/* ─── Ceiling Ring Canopy ─── */}
      <CeilingRings position={[0, 2.05, 0]} radius={roomRadius * 0.90} />

      {/* ─── Perimeter Wall Screen Banks ─── */}
      {/* Back wall — center map display */}
      <WallScreenBank
        position={[0, 0.90, -zD * 0.36]}
        rotation={[0, 0, 0]}
        size={[0.55, 0.40]}
      />

      {/* Back-left wall */}
      <WallScreenBank
        position={[-zW * 0.32, 0.90, -zD * 0.34]}
        rotation={[0, Math.PI / 12, 0]}
        size={[0.38, 0.30]}
      />

      {/* Back-right wall */}
      <WallScreenBank
        position={[zW * 0.32, 0.90, -zD * 0.34]}
        rotation={[0, -Math.PI / 12, 0]}
        size={[0.38, 0.30]}
      />

      {/* Left wall screen */}
      <WallScreenBank
        position={[-zW * 0.36, 0.80, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[0.35, 0.30]}
      />

      {/* Right wall screen */}
      <WallScreenBank
        position={[zW * 0.36, 0.80, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[0.35, 0.30]}
      />

      {/* ─── Perimeter Console Stations ─── */}
      <ConsoleStation position={[0, 0, -zD * 0.32]} rotation={[0, 0, 0]} />
      <ConsoleStation position={[-zW * 0.30, 0, -zD * 0.20]} rotation={[0, Math.PI / 4, 0]} />
      <ConsoleStation position={[zW * 0.30, 0, -zD * 0.20]} rotation={[0, -Math.PI / 4, 0]} />

      {/* ─── TRAEFIK PROXY — floating label above tower ─── */}
      <group position={[0, 2.25, 0.05]}>
        <Text
          fontSize={0.14}
          color="#00ccff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.005}
          outlineColor="#0a1a2a"
        >
          TRAEFIK PROXY
        </Text>
        {/* Underline glow */}
        <mesh position={[0, -0.08, 0.01]}>
          <boxGeometry args={[0.80, 0.004, 0.008]} />
          <meshBasicMaterial color="#00aaff" transparent opacity={0.5} />
        </mesh>
        <pointLight position={[0, 0, 0.2]} intensity={0.6} color="#00ccff" distance={2.5} />
      </group>

      {/* ─── Ambient point lights — cool blue command center glow ─── */}
      <pointLight position={[0, 1.0, 0]} intensity={0.6} color="#003366" distance={4} />
      <pointLight position={[-zW * 0.25, 0.8, -zD * 0.25]} intensity={0.4} color="#0066aa" distance={3} />
      <pointLight position={[zW * 0.25, 0.8, -zD * 0.25]} intensity={0.4} color="#0066aa" distance={3} />

      {/* ─── Zone label on floor ─── */}
      <Text
        position={[zW * 0.05, 0.06, zD * 0.40]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#4488aa"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#080c16"
      >
        📡 DATA CENTRE
      </Text>
    </group>
  )
}
