import React from 'react'

// ─── Corridor & Open Space Decor — Polished Layout ──────────────────
// Places hallway markings, plants, water coolers, and ambient details
// in the empty corridor spaces between zones.

interface CorridorDecorProps {
  gridCols: number
  gridRows: number
}

export default function CorridorDecor({ gridCols, gridRows }: CorridorDecorProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows
  const hw = -floorWidth / 2
  const hd = -floorDepth / 2

  // Helper to position decor at grid cell center
  const cell = (col: number, row: number): [number, number, number] => {
    return [
      hw + col * cellW + cellW / 2,
      0,
      hd + row * cellD + cellD / 2,
    ]
  }

  // Potted plant at grid position (col, row)
  const Plant = ({ col, row, size = 1 }: { col: number; row: number; size?: number }) => {
    const [x, _, z] = cell(col, row)
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.12 * size, 0]} castShadow>
          <cylinderGeometry args={[0.04 * size, 0.055 * size, 0.12 * size, 8]} />
          <meshStandardMaterial color="#5a3a2a" />
        </mesh>
        <mesh position={[0, 0.26 * size, 0]} castShadow>
          <sphereGeometry args={[0.08 * size, 8, 8]} />
          <meshStandardMaterial color="#2d5a27" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.33 * size, 0.04 * size]} castShadow>
          <sphereGeometry args={[0.05 * size, 8, 8]} />
          <meshStandardMaterial color="#3a6b33" roughness={0.8} />
        </mesh>
      </group>
    )
  }

  // Water cooler at grid position
  const WaterCooler = ({ col, row }: { col: number; row: number }) => {
    const [x, _, z] = cell(col, row)
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.38, 16]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} metalness={0.1} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 0.1, 16]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.26, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
          <meshStandardMaterial color="#e8e8e8" />
        </mesh>
      </group>
    )
  }

  // Trash can / recycling bin
  const TrashBin = ({ col, row }: { col: number; row: number }) => {
    const [x, _, z] = cell(col, row)
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.28, 12]} />
          <meshStandardMaterial color="#4a5568" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* ─── Hallway Painted Lines (corridor floor markings) ─── */}
      {/* Corridor centerline — dashed, runs through the main east-west corridor (rows 2-5) */}
      {Array.from({ length: 19 }).map((_, i) => {
        const t = i / 19
        const startX = cell(2, 3)[0]
        const endX = cell(8, 3)[0]
        const x = startX + t * (endX - startX)
        const z = cell(0, 3)[2]
        if (i % 2 === 0) return null
        return (
          <mesh key={`dash-${i}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 0.04]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} />
          </mesh>
        )
      })}

      {/* Corridor centerline — extended east through cols 8-10 row 3 */}
      {Array.from({ length: 10 }).map((_, i) => {
        const t = (i + 0.5) / 10
        const startX = cell(8, 3)[0]
        const endX = cell(10, 3)[0]
        const x = startX + t * (endX - startX)
        const z = cell(0, 3)[2]
        if (i % 2 === 0) return null
        return (
          <mesh key={`dash-ext-${i}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.08, 0.03]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
          </mesh>
        )
      })}

      {/* South edge line (row 4.8 boundary — corridor bottom) */}
      {Array.from({ length: 20 }).map((_, i) => {
        const t = (i + 0.5) / 20
        const startX = cell(2, 4.8)[0]
        const endX = cell(10, 4.8)[0]
        const x = startX + t * (endX - startX)
        const z = cell(0, 4.8)[2]
        return (
          <mesh key={`eline-s-${i}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color="#6c7a8d" transparent opacity={0.15} />
          </mesh>
        )
      })}

      {/* North edge line (row 2.2 boundary — patch/vault end) */}
      {Array.from({ length: 15 }).map((_, i) => {
        const t = (i + 0.5) / 15
        const startX = cell(2, 2.2)[0]
        const endX = cell(7, 2.2)[0]
        const x = startX + t * (endX - startX)
        const z = cell(0, 2.2)[2]
        return (
          <mesh key={`eline-n-${i}`} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color="#6c7a8d" transparent opacity={0.15} />
          </mesh>
        )
      })}

      {/* ─── Floor Directional Arrows ─── */}
      <mesh position={[cell(4, 3)[0], 0.005, cell(4, 3)[2]]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.1, 0.08]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
      </mesh>
      {/* Arrow pointing toward DC (far right) */}
      <mesh position={[cell(9, 3)[0], 0.005, cell(9, 3)[2]]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.08, 0.06]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.2} />
      </mesh>

      {/* ─── Plants — scattered through corridors (updated positions) ─── */}
      <Plant col={3} row={3} size={0.9} />
      <Plant col={6} row={4} size={1.0} />
      <Plant col={9} row={4} size={1.1} />
      <Plant col={10} row={5} size={0.8} />
      <Plant col={11} row={6} size={0.8} />
      <Plant col={2} row={4} size={1.0} />

      {/* ─── Water Coolers — break areas in corridor ─── */}
      <WaterCooler col={4} row={4} />
      <WaterCooler col={8} row={4} />

      {/* ─── Trash / Recycling bins ─── */}
      <TrashBin col={6} row={4} />
      <TrashBin col={10} row={7} />

      {/* ─── Bench seating in main corridor ─── */}
      {/* Bench 1 — central corridor */}
      <mesh position={[cell(5, 3)[0], 0.15, cell(5, 3)[2]]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.12]} />
        <meshStandardMaterial color="#5a4a3a" metalness={0.05} roughness={0.7} />
      </mesh>
      {[[-0.22, 0], [0.22, 0]].map(([bx, bz], i) => (
        <mesh key={`bench1-leg-${i}`} position={[cell(5, 3)[0] + bx, 0.06, cell(5, 3)[2] + bz]}>
          <boxGeometry args={[0.03, 0.12, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* Bench 2 — near DC entrance */}
      <mesh position={[cell(9, 4)[0], 0.14, cell(9, 4)[2]]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.1]} />
        <meshStandardMaterial color="#5a4a3a" metalness={0.05} roughness={0.7} />
      </mesh>
      {[[-0.15, 0], [0.15, 0]].map(([bx, bz], i) => (
        <mesh key={`bench2-leg-${i}`} position={[cell(9, 4)[0] + bx, 0.05, cell(9, 4)[2] + bz]}>
          <boxGeometry args={[0.025, 0.1, 0.025]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* ─── Fire extinguisher (wall-mounted in corridor) ─── */}
      <mesh position={[cell(2, 3)[0], 0.35, cell(2, 3)[2] + cellD * 0.4]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 12]} />
        <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[cell(2, 3)[0], 0.52, cell(2, 3)[2] + cellD * 0.4]}>
        <cylinderGeometry args={[0.015, 0.04, 0.06, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ─── Ceiling pendant lights (ambient corridor lighting) ─── */}
      {[3, 5, 7, 9].map((col) => (
        <group key={`ceiling-light-${col}`}>
          <mesh position={[cell(col, 3)[0], 1.0, cell(col, 3)[2]]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.06, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.25} roughness={0.2} />
          </mesh>
          <mesh position={[cell(col, 3)[0], 1.2, cell(col, 3)[2]]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
      
      {/* Ceiling lights along vertical corridor near server */}
      {[1, 3, 5, 7].map((row) => (
        <group key={`ceiling-v-${row}`}>
          <mesh position={[cell(1, row)[0] + cellW * 0.8, 1.0, cell(1, row)[2]]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.05, 16]} />
            <meshStandardMaterial color="#39bae6" emissive="#39bae6" emissiveIntensity={0.2} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ─── Rubber floor mat (at entrance to server/office area) ─── */}
      <mesh position={[cell(2, 3)[0], 0.003, cell(2, 3)[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} transparent opacity={0.4} />
      </mesh>
      
      {/* ─── Rubber floor mat (at entrance to office/meeting area) ─── */}
      <mesh position={[cell(5, 5)[0], 0.003, cell(5, 5)[2] - cellD * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} transparent opacity={0.4} />
      </mesh>

      {/* ─── Welcome mat at main corridor entrance (east side) ─── */}
      <mesh position={[cell(9, 4)[0], 0.003, cell(9, 4)[2] - cellD * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.12]} />
        <meshStandardMaterial color="#1a2a3a" roughness={0.9} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}
