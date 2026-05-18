import React from 'react'

// ─── Oly's Office Furniture — 2×3 (cols 2-3, rows 5-7) ──────────────
// Sleek modern command center: thin floating desk, minimalist chair,
// dual monitors, bookshelf, plant, filing cabinet

interface OfficeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const DESK_TOP = '#e8ecef'
const DESK_LEG = '#9ca3af'
const CHAIR_FABRIC = '#3d3d4a'
const CHAIR_FRAME = '#6b7280'
const MONITOR_BEZEL = '#1a1a1a'
const SCREEN_COLOR = '#1e3a5f'

export default function OfficeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: OfficeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  // Fixed furniture size — desk stays compact regardless of zone dimensions
  const DESK_W = 1.2
  const DESK_D = 0.75
  const RUG_W = 1.8
  const RUG_D = 1.4

  return (
    <group>
      {/* Floor rug / mat */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RUG_W, RUG_D]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.9} transparent opacity={0.25} />
      </mesh>

      {/* Sleek modern desk — thin top surface (fixed size) */}
      <mesh position={[cx, 0.38, cz]} castShadow>
        <boxGeometry args={[DESK_W, 0.02, DESK_D]} />
        <meshStandardMaterial color={DESK_TOP} metalness={0.15} roughness={0.25} />
      </mesh>

      {/* Desk edge accent — subtle dark trim */}
      <mesh position={[cx, 0.39, cz]}>
        <boxGeometry args={[DESK_W + 0.02, 0.005, DESK_D + 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.3} />
      </mesh>

      {/* Minimal metal legs — slim cylindrical posts */}
      {[
        [-DESK_W * 0.44, -DESK_D * 0.42], [DESK_W * 0.44, -DESK_D * 0.42],
        [-DESK_W * 0.44, DESK_D * 0.42], [DESK_W * 0.44, DESK_D * 0.42],
      ].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[cx + lx, 0.19, cz + lz]} castShadow>
          <cylinderGeometry args={[0.015, 0.018, 0.38, 12]} />
          <meshStandardMaterial color={DESK_LEG} metalness={0.75} roughness={0.2} />
        </mesh>
      ))}

      {/* Horizontal leg brace — subtle connector bar */}
      <mesh position={[cx, 0.06, cz - DESK_D * 0.42]} castShadow>
        <boxGeometry args={[DESK_W * 0.85, 0.012, 0.012]} />
        <meshStandardMaterial color={DESK_LEG} metalness={0.75} roughness={0.2} />
      </mesh>

      {/* Modern office chair — behind desk (facing toward desk) */}
      <group position={[cx, 0, cz + DESK_D * 0.55]} rotation={[0, Math.PI, 0]}>
        {/* Seat cushion */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.07, 0.03, 16]} />
          <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.05} roughness={0.7} />
        </mesh>
        {/* Backrest — mesh back with frame */}
        <mesh position={[0, 0.38, -0.05]} castShadow>
          <boxGeometry args={[0.11, 0.26, 0.02]} />
          <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.05} roughness={0.65} />
        </mesh>
        {/* Backrest frame — chrome outline */}
        <mesh position={[0, 0.38 + 0.13, -0.05]}>
          <boxGeometry args={[0.13, 0.015, 0.03]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.38 - 0.13, -0.05]}>
          <boxGeometry args={[0.13, 0.015, 0.03]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Lumbar support detail */}
        <mesh position={[0, 0.32, -0.025]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.05} roughness={0.6} />
        </mesh>
        {/* Armrests — slim */}
        <mesh position={[-0.07, 0.28, 0.01]} castShadow>
          <boxGeometry args={[0.012, 0.025, 0.06]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.07, 0.28, 0.01]} castShadow>
          <boxGeometry args={[0.012, 0.025, 0.06]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Gas lift */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.014, 0.2, 10]} />
          <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* 5-star base */}
        {[0, 72, 144, 216, 288].map((deg, j) => {
          const rad = (deg * Math.PI) / 180
          return (
            <mesh key={`cb-${j}`} position={[Math.cos(rad) * 0.035, 0.04, Math.sin(rad) * 0.035]} rotation={[0, -rad, 0]}>
              <boxGeometry args={[0.002, 0.005, 0.055]} />
              <meshStandardMaterial color={CHAIR_FRAME} metalness={0.85} roughness={0.15} />
            </mesh>
          )
        })}
        {/* Casters */}
        {[0, 72, 144, 216, 288].map((deg, j) => {
          const rad = (deg * Math.PI) / 180
          return (
            <mesh key={`cs-${j}`} position={[Math.cos(rad) * 0.058, 0.016, Math.sin(rad) * 0.058]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
            </mesh>
          )
        })}
      </group>

      {/* Main monitor — slim bezel, on desk */}
      <mesh position={[cx, 0.55, cz - DESK_D * 0.22]} castShadow>
        <boxGeometry args={[0.24, 0.18, 0.015]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[cx, 0.55, cz - DESK_D * 0.18]}>
        <planeGeometry args={[0.22, 0.16]} />
        <meshStandardMaterial color={SCREEN_COLOR} emissive={SCREEN_COLOR} emissiveIntensity={0.45} />
      </mesh>
      {/* Monitor stand — sleek single arm */}
      <mesh position={[cx, 0.43, cz - DESK_D * 0.22]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.08, 12]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[cx, 0.40, cz - DESK_D * 0.22]}>
        <cylinderGeometry args={[0.04, 0.04, 0.015, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Side monitor (left) — matching slim style */}
      <mesh position={[cx - 0.33, 0.48, cz - DESK_D * 0.22]} castShadow>
        <boxGeometry args={[0.14, 0.1, 0.012]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[cx - 0.33, 0.48, cz - DESK_D * 0.18]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color={SCREEN_COLOR} emissive={SCREEN_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[cx - 0.33, 0.435, cz - DESK_D * 0.22]} castShadow>
        <cylinderGeometry args={[0.01, 0.015, 0.06, 10]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Side monitor (right) */}
      <mesh position={[cx + 0.33, 0.48, cz - DESK_D * 0.22]} castShadow>
        <boxGeometry args={[0.14, 0.1, 0.012]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[cx + 0.33, 0.48, cz - DESK_D * 0.18]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color={SCREEN_COLOR} emissive={SCREEN_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[cx + 0.33, 0.435, cz - DESK_D * 0.22]} castShadow>
        <cylinderGeometry args={[0.01, 0.015, 0.06, 10]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Sleek keyboard area glow on desk */}
      <mesh position={[cx, 0.40, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshBasicMaterial color="#39bae6" transparent opacity={0.15} />
      </mesh>

      {/* Bookshelf against left wall */}
      <mesh position={[cx - 0.75, 0.35, cz]} castShadow>
        <boxGeometry args={[0.07, 0.65, 0.5]} />
        <meshStandardMaterial color="#4a3a2a" metalness={0.1} roughness={0.7} />
      </mesh>
      {[0.08, 0.22, 0.4].map((sy, i) => (
        <mesh key={`shelf-${i}`} position={[cx - 0.75, sy + 0.1, cz]}>
          <boxGeometry args={[0.08, 0.02, 0.45]} />
          <meshStandardMaterial color="#3a2a1a" metalness={0.05} roughness={0.8} />
        </mesh>
      ))}

      {/* Filing cabinet — sleek modern metal */}
      <mesh position={[cx + 0.7, 0.28, cz - 0.35]} castShadow>
        <boxGeometry args={[0.07, 0.28, 0.1]} />
        <meshStandardMaterial color="#5a6068" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Cabinet drawer handles — horizontal bars */}
      {[0.06, 0.14, 0.22].map((dy, i) => (
        <mesh key={`drawer-${i}`} position={[cx + 0.7, dy + 0.14, cz - 0.35 + 0.05]}>
          <boxGeometry args={[0.035, 0.006, 0.01]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Plant in corner */}
      <mesh position={[cx + 0.55, 0.14, cz + 0.75]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[cx + 0.55, 0.28, cz + 0.75]} castShadow>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {/* Wall clock — minimalist */}
      <mesh position={[cx, 0.55, cz - 0.85]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 16]} />
        <meshStandardMaterial color="#e8e8e0" />
      </mesh>
      <mesh position={[cx, 0.55, cz - 0.84]}>
        <boxGeometry args={[0.001, 0.04, 0.001]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* "⚙️" label on floor near entrance */}
      <mesh position={[cx - 0.4, 0.03, cz + 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
