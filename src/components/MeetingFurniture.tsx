import React from 'react'

// ─── Meeting Room Furniture — 3×3 (cols 5-7, rows 5-7) ─────────────
// Premium conference room: oval table, 8 leather office chairs,
// projector screen, whiteboard, water cooler, phone/speaker unit

interface MeetingFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// Leather chair colors
const LEATHER_SEAT = '#3d1f0a'
const LEATHER_BACK = '#5a2a10'
const LEATHER_TRIM = '#6b3a1f'

export default function MeetingFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: MeetingFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const tableW = colSpan * cellW * 0.6
  const tableD = rowSpan * cellD * 0.38
  const tableY = 0.38

  // Chairs: 3 per long side + 1 per short side = 8 total (scaled positions for larger chairs)
  const chairs = [
    { x: -0.26, z: -tableD / 2 + 0.10, rot: Math.PI },
    { x: 0, z: -tableD / 2 + 0.10, rot: Math.PI },
    { x: 0.26, z: -tableD / 2 + 0.10, rot: Math.PI },
    { x: -0.26, z: tableD / 2 - 0.10, rot: 0 },
    { x: 0, z: tableD / 2 - 0.10, rot: 0 },
    { x: 0.26, z: tableD / 2 - 0.10, rot: 0 },
    { x: -tableW / 2 + 0.10, z: 0, rot: Math.PI / 2 },
    { x: tableW / 2 - 0.10, z: 0, rot: -Math.PI / 2 },
  ]

  return (
    <group>
      {/* ─── Oval Conference Table ─── */}
      <group position={[cx, tableY, cz]}>
        {/* Oval top — stretched cylinder for elliptical shape */}
        <group scale={[tableW / 2 * 1.0, 1, tableD / 2 * 1.0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1, 1, 0.05, 48]} />
            <meshStandardMaterial color="#3d2b1f" metalness={0.08} roughness={0.55} />
          </mesh>
        </group>

        {/* Table edge / rim (slightly wider ring) */}
        <group scale={[tableW / 2 * 0.98, 1, tableD / 2 * 0.98]}>
          <mesh position={[0, 0.02, 0]}>
            <torusGeometry args={[1, 0.015, 8, 64]} />
            <meshStandardMaterial color="#2d1f15" metalness={0.15} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Table legs — 4 sleek tapered legs */}
      {[
        [-tableW * 0.36, -tableD * 0.33], [tableW * 0.36, -tableD * 0.33],
        [-tableW * 0.36, tableD * 0.33], [tableW * 0.36, tableD * 0.33],
      ].map(([lx, lz], i) => (
        <group key={`leg-${i}`} position={[cx + lx, 0.19, cz + lz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.025, 0.035, 0.38, 12]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ─── Leather Office Chairs (8 around table) ─── */}
      {chairs.map((ch, i) => (
        <group key={`ch-${i}`} position={[cx + ch.x, 0, cz + ch.z]} rotation={[0, ch.rot, 0]}>
          {/* Seat cushion — leather, rounded (scaled ~1.6×) */}
          <mesh position={[0, 0.26, 0]} castShadow>
            <cylinderGeometry args={[0.10, 0.105, 0.04, 16]} />
            <meshStandardMaterial color={LEATHER_SEAT} metalness={0.05} roughness={0.45} />
          </mesh>
          {/* Seat edge trim */}
          <mesh position={[0, 0.25, 0]}>
            <torusGeometry args={[0.10, 0.01, 8, 16]} />
            <meshStandardMaterial color={LEATHER_TRIM} metalness={0.1} roughness={0.4} />
          </mesh>
          {/* Backrest — leather padded panel */}
          <mesh position={[0, 0.42, -0.08]} castShadow>
            <boxGeometry args={[0.16, 0.35, 0.035]} />
            <meshStandardMaterial color={LEATHER_BACK} metalness={0.05} roughness={0.4} />
          </mesh>
          {/* Backrest top curve */}
          <mesh position={[0, 0.60, -0.08]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshStandardMaterial color={LEATHER_BACK} metalness={0.05} roughness={0.4} />
          </mesh>
          {/* Armrests — polished chrome */}
          <mesh position={[-0.095, 0.34, 0.015]} castShadow>
            <boxGeometry args={[0.015, 0.04, 0.09]} />
            <meshStandardMaterial color="#888" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0.095, 0.34, 0.015]} castShadow>
            <boxGeometry args={[0.015, 0.04, 0.09]} />
            <meshStandardMaterial color="#888" metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Chrome chair base + casters */}
          <mesh position={[0, 0.06, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.08, 0.05, 8]} />
            <meshStandardMaterial color="#777" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Central gas lift pole */}
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.22, 8]} />
            <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* 5-star base legs */}
          {[0, 72, 144, 216, 288].map((deg, j) => {
            const rad = (deg * Math.PI) / 180
            return (
              <mesh
                key={`cl-${j}`}
                position={[Math.cos(rad) * 0.058, 0.05, Math.sin(rad) * 0.058]}
                rotation={[0, -rad, 0]}
              >
                <boxGeometry args={[0.003, 0.008, 0.085]} />
                <meshStandardMaterial color="#777" metalness={0.9} roughness={0.1} />
              </mesh>
            )
          })}
          {/* Casters */}
          {[0, 72, 144, 216, 288].map((deg, j) => {
            const rad = (deg * Math.PI) / 180
            return (
              <mesh
                key={`cast-${j}`}
                position={[Math.cos(rad) * 0.095, 0.022, Math.sin(rad) * 0.095]}
              >
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* ─── Projector screen (on back wall, -Z side) ─── */}
      <mesh position={[cx, 0.42, cz - tableD / 2 - 0.18]} castShadow>
        <boxGeometry args={[0.6, 0.38, 0.02]} />
        <meshStandardMaterial color="#e8e8e0" roughness={0.25} emissive="#f8f8f0" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[cx, 0.42, cz - tableD / 2 - 0.19]}>
        <boxGeometry args={[0.66, 0.42, 0.02]} />
        <meshStandardMaterial color="#888" metalness={0.85} roughness={0.15} transparent opacity={0.4} />
      </mesh>
      {/* Projector unit on ceiling above table */}
      <mesh position={[cx + tableW * 0.25, 0.72, cz - tableD * 0.2]} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* ─── Whiteboard (on left wall, -X side) ─── */}
      <mesh position={[cx - colSpan * cellW * 0.42, 0.35, cz]} castShadow>
        <boxGeometry args={[0.02, 0.45, rowSpan * cellD * 0.38]} />
        <meshStandardMaterial color="#f0f0e8" roughness={0.2} />
      </mesh>
      <mesh position={[cx - colSpan * cellW * 0.43, 0.35, cz]}>
        <boxGeometry args={[0.03, 0.48, rowSpan * cellD * 0.4]} />
        <meshStandardMaterial color="#999" metalness={0.8} roughness={0.15} transparent opacity={0.35} />
      </mesh>

      {/* ─── Water Cooler (corner) ─── */}
      <mesh position={[cx + tableW * 0.5 + 0.08, 0.25, cz - rowSpan * cellD * 0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.4, 16]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.55} metalness={0.1} roughness={0.5} />
      </mesh>
      <mesh position={[cx + tableW * 0.5 + 0.08, 0.46, cz - rowSpan * cellD * 0.2]}>
        <cylinderGeometry args={[0.07, 0.05, 0.12, 16]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[cx + tableW * 0.5 + 0.18, 0.3, cz - rowSpan * cellD * 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* ─── Conference phone / speaker unit on table ─── */}
      <mesh position={[cx, tableY + 0.03, cz]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[cx, tableY + 0.04, cz]}>
        <cylinderGeometry args={[0.025, 0.025, 0.005, 16]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>

      {/* Potted plant in corner */}
      <mesh position={[cx - tableW * 0.5 - 0.05, 0.14, cz + rowSpan * cellD * 0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[cx - tableW * 0.5 - 0.05, 0.28, cz + rowSpan * cellD * 0.3]} castShadow>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {/* "📋" floor decal */}
      <mesh position={[cx + tableW * 0.35, 0.03, cz - tableD * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
