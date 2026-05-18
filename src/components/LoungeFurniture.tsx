import React from 'react'

// ─── Lounge Area Furniture — 3×4 (cols 7-9, rows 0-3) ──────────────
// Modern chill-out zone: convertible lounge chairs, coffee table,
// whiteboard, small meeting table, pendant light

interface LoungeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// Convertible lounge chair — reclines, has footrest
function LoungeChair({ position, rotation, color }: {
  position: [number, number, number]
  rotation: number
  color: string
}) {
  const chairColor = color
  const cushionColor = color // slightly lighter via material properties

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat base — wide, low, plush */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.18]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.75} />
      </mesh>
      {/* Seat cushion top — rounded pillowy appearance */}
      <mesh position={[0, 0.19, 0]} castShadow>
        <boxGeometry args={[0.14, 0.04, 0.16]} />
        <meshStandardMaterial color={cushionColor} metalness={0.02} roughness={0.8} />
      </mesh>

      {/* Backrest — angled back, thick and plush */}
      <mesh position={[0, 0.22, -0.07]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.16, 0.2, 0.05]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.7} />
      </mesh>
      {/* Backrest top cushion roll */}
      <mesh position={[0, 0.34, -0.1]} rotation={[0.25, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.75} />
      </mesh>

      {/* Armrests — wide, padded */}
      <mesh position={[-0.09, 0.17, -0.02]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.16]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.7} />
      </mesh>
      <mesh position={[-0.09, 0.20, -0.02]}>
        <boxGeometry args={[0.04, 0.02, 0.14]} />
        <meshStandardMaterial color={cushionColor} metalness={0.02} roughness={0.8} />
      </mesh>
      <mesh position={[0.09, 0.17, -0.02]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.16]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.7} />
      </mesh>
      <mesh position={[0.09, 0.20, -0.02]}>
        <boxGeometry args={[0.04, 0.02, 0.14]} />
        <meshStandardMaterial color={cushionColor} metalness={0.02} roughness={0.8} />
      </mesh>

      {/* Footrest / ottoman — extends in front */}
      <mesh position={[0, 0.08, 0.12]} castShadow>
        <boxGeometry args={[0.12, 0.05, 0.1]} />
        <meshStandardMaterial color={chairColor} metalness={0.03} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0.12]} castShadow>
        <boxGeometry args={[0.1, 0.025, 0.08]} />
        <meshStandardMaterial color={cushionColor} metalness={0.02} roughness={0.8} />
      </mesh>

      {/* Low-profile legs */}
      {[[-0.06, -0.07], [0.06, -0.07], [-0.06, 0.07], [0.06, 0.07]].map(([lx, lz], i) => (
        <mesh key={`ll-${i}`} position={[lx, 0.04, lz]}>
          <cylinderGeometry args={[0.012, 0.014, 0.06, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export default function LoungeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: LoungeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const w = colSpan * cellW
  const d = rowSpan * cellD

  return (
    <group>
      {/* Floor rug — warm accent */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.7, d * 0.5]} />
        <meshStandardMaterial color="#3a2050" roughness={0.9} transparent opacity={0.35} />
      </mesh>

      {/* ─── Convertible Lounge Chairs (4 chairs in relaxed arrangement) ─── */}
      <LoungeChair
        position={[cx - w * 0.22, 0, cz - d * 0.28]}
        rotation={Math.PI * 0.1}
        color="#5a3a6a"
      />
      <LoungeChair
        position={[cx + w * 0.08, 0, cz - d * 0.3]}
        rotation={-Math.PI * 0.12}
        color="#4a5a6a"
      />
      <LoungeChair
        position={[cx - w * 0.15, 0, cz + d * 0.08]}
        rotation={Math.PI * 0.7}
        color="#3a4a5a"
      />
      <LoungeChair
        position={[cx + w * 0.15, 0, cz + d * 0.05]}
        rotation={-Math.PI * 0.6}
        color="#4a3a4a"
      />

      {/* ─── Coffee Table — low, central ─── */}
      <mesh position={[cx - w * 0.02, 0.12, cz - d * 0.05]} castShadow>
        <boxGeometry args={[w * 0.35, 0.03, d * 0.22]} />
        <meshStandardMaterial color="#5a4a3a" metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Table top glass accent */}
      <mesh position={[cx - w * 0.02, 0.14, cz - d * 0.05]}>
        <boxGeometry args={[w * 0.34, 0.01, d * 0.21]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.3} roughness={0.2} opacity={0.6} transparent />
      </mesh>
      {/* Table legs */}
      {[
        [-w * 0.16, -d * 0.09], [w * 0.16, -d * 0.09],
        [-w * 0.16, d * 0.09], [w * 0.16, d * 0.09],
      ].map(([lx, lz], i) => (
        <mesh key={`ctl-${i}`} position={[cx - 0.02 + lx, 0.06, cz - 0.05 + lz]}>
          <cylinderGeometry args={[0.015, 0.018, 0.12, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      {/* ─── Side Table ─── */}
      <mesh position={[cx - w * 0.28, 0.16, cz + d * 0.15]} castShadow>
        <boxGeometry args={[0.1, 0.02, 0.1]} />
        <meshStandardMaterial color="#e8ecef" metalness={0.15} roughness={0.3} />
      </mesh>
      <mesh position={[cx - w * 0.28, 0.07, cz + d * 0.15]}>
        <cylinderGeometry args={[0.015, 0.018, 0.18, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Small item on side table (coffee mug) */}
      <mesh position={[cx - w * 0.3, 0.19, cz + d * 0.17]}>
        <cylinderGeometry args={[0.02, 0.018, 0.04, 10]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
      </mesh>

      {/* ─── Whiteboard against left wall ─── */}
      <mesh position={[cx - w * 0.42, 0.42, cz]} castShadow>
        <boxGeometry args={[0.02, 0.5, d * 0.4]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.3} />
      </mesh>
      <mesh position={[cx - w * 0.43, 0.42, cz]}>
        <boxGeometry args={[0.03, 0.52, d * 0.42]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} transparent opacity={0.4} />
      </mesh>

      {/* ─── Pendant light ─── */}
      <mesh position={[cx - w * 0.02, 0.85, cz - d * 0.05]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.08, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[cx - w * 0.02, 0.95, cz - d * 0.05]}>
        <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ─── Small meeting table in back corner ─── */}
      <mesh position={[cx + w * 0.08, 0.32, cz + d * 0.3]} castShadow>
        <boxGeometry args={[w * 0.25, 0.04, d * 0.12]} />
        <meshStandardMaterial color="#3d2b1f" metalness={0.05} roughness={0.8} />
      </mesh>
      {/* Stools around small table */}
      {[[-0.8, 0], [0.8, 0], [0, -0.8], [0, 0.8]].map(([sx, sz], i) => (
        <mesh
          key={`stool-${i}`}
          position={[cx + 0.08 + sx * w * 0.09, 0.18, cz + 0.3 + sz * d * 0.05]}
          castShadow
        >
          <cylinderGeometry args={[0.045, 0.05, 0.05, 12]} />
          <meshStandardMaterial color="#5a6068" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      {/* ─── Floor lamp in corner ─── */}
      <mesh position={[cx + w * 0.35, 0.55, cz - d * 0.35]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[cx + w * 0.35, 0.92, cz - d * 0.35]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>

      {/* Plant in corner */}
      <mesh position={[cx + w * 0.35, 0.14, cz + d * 0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[cx + w * 0.35, 0.28, cz + d * 0.3]} castShadow>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
    </group>
  )
}
