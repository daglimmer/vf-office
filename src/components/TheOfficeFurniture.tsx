import React from 'react'

// ─── The Office Furniture — modern open-plan (2026-05-17) ──────────
// 2 columns × 3 rows of compact tech desks (6 total)
// Each desk: thin top, slim legs, widescreen monitor, keyboard
// Modern co-working aesthetic

interface TheOfficeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const DESK_TOP   = '#dce1e6'
const DESK_LEG   = '#8b95a1'
const MONITOR_BEZEL = '#141414'
const SCREEN_COLOR  = '#1a2d4a'

export default function TheOfficeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: TheOfficeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const zW = colSpan * cellW   // zone width
  const zD = rowSpan * cellD   // zone depth

  // 2 columns × 3 rows
  const COLS = 2
  const ROWS = 3
  const colSpacing = zW / (COLS + 1)   // ~1.5m spacing
  const rowSpacing = zD / (ROWS + 1)   // ~1.125m spacing

  const deskW = 0.95
  const deskD = 0.50
  const deskY = 0.38

  // Desk column X offsets (centered in zone)
  const colOffsets = [ -colSpacing / 2, colSpacing / 2 ]
  // Desk row Z offsets (centered in zone)
  const rowOffsets = [ -rowSpacing, 0, rowSpacing ]

  const desks: { dx: number; dz: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      desks.push({ dx: colOffsets[c], dz: rowOffsets[r] })
    }
  }

  return (
    <group>
      {/* Floor accent — large dark mat */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.85, zD * 0.85]} />
        <meshStandardMaterial color="#1a2330" roughness={0.85} transparent opacity={0.35} />
      </mesh>

      {desks.map((d, i) => (
        <group key={`desk-${i}`} position={[cx + d.dx, 0, cz + d.dz]}>
          {/* Desk top — thin elegant surface */}
          <mesh position={[0, deskY, 0]} castShadow>
            <boxGeometry args={[deskW, 0.02, deskD]} />
            <meshStandardMaterial color={DESK_TOP} metalness={0.12} roughness={0.22} />
          </mesh>

          {/* Desk edge trim — darker accent */}
          <mesh position={[0, deskY + 0.01, 0]}>
            <boxGeometry args={[deskW + 0.015, 0.004, deskD + 0.015]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.25} roughness={0.3} />
          </mesh>

          {/* Desk legs — 4 slim cylindrical posts */}
          {[
            [-deskW * 0.44, -deskD * 0.44],
            [ deskW * 0.44, -deskD * 0.44],
            [-deskW * 0.44,  deskD * 0.44],
            [ deskW * 0.44,  deskD * 0.44],
          ].map(([lx, lz], j) => (
            <mesh key={`leg-${i}-${j}`} position={[lx, 0.19, lz]} castShadow>
              <cylinderGeometry args={[0.012, 0.014, 0.38, 10]} />
              <meshStandardMaterial color={DESK_LEG} metalness={0.7} roughness={0.2} />
            </mesh>
          ))}

          {/* Horizontal leg brace — front */}
          <mesh position={[0, 0.06, -deskD * 0.44]}>
            <boxGeometry args={[deskW * 0.75, 0.01, 0.01]} />
            <meshStandardMaterial color={DESK_LEG} metalness={0.7} roughness={0.2} />
          </mesh>

          {/* Widescreen monitor — centered, toward front of desk */}
          <mesh position={[0, 0.54, -deskD * 0.18]} castShadow>
            <boxGeometry args={[0.18, 0.11, 0.011]} />
            <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.45} roughness={0.15} />
          </mesh>
          {/* Monitor screen — emissive glow */}
          <mesh position={[0, 0.54, -deskD * 0.165]}>
            <planeGeometry args={[0.16, 0.09]} />
            <meshStandardMaterial
              color={SCREEN_COLOR}
              emissive={SCREEN_COLOR}
              emissiveIntensity={0.35 + (i % 3) * 0.08}
            />
          </mesh>
          {/* Monitor stand — single slim arm */}
          <mesh position={[0, 0.425, -deskD * 0.18]} castShadow>
            <cylinderGeometry args={[0.01, 0.014, 0.06, 10]} />
            <meshStandardMaterial color="#777" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.395, -deskD * 0.18]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 12]} />
            <meshStandardMaterial color="#777" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Keyboard — centered in front of desk */}
          <mesh position={[0, deskY + 0.012, deskD * 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.16, 0.05, 0.006]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.1} roughness={0.5} />
          </mesh>
          {/* Keyboard backlight glow */}
          <mesh position={[0, deskY + 0.015, deskD * 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 0.04]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.08} />
          </mesh>

          {/* Small mouse pad */}
          <mesh position={[0.07, deskY + 0.013, deskD * 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 0.04]} />
            <meshStandardMaterial color="#2a2a3a" roughness={0.7} />
          </mesh>

          {/* Coffee mug on desk (randomized slightly) */}
          {i % 3 === 0 && (
            <group position={[-0.06, 0.41, -deskD * 0.05]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.018, 0.016, 0.04, 12]} />
                <meshStandardMaterial color="#e8e0d0" roughness={0.5} />
              </mesh>
              {/* Mug handle */}
              <mesh position={[0.018, 0, 0]}>
                <torusGeometry args={[0.012, 0.004, 8, 8, Math.PI]} />
                <meshStandardMaterial color="#e8e0d0" roughness={0.5} />
              </mesh>
            </group>
          )}

          {/* Small plant for some desks */}
          {i % 2 === 1 && (
            <group position={[0.07, 0.42, -deskD * 0.05]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.014, 0.016, 0.025, 8]} />
                <meshStandardMaterial color="#5a3a2a" />
              </mesh>
              <mesh position={[0, 0.025, 0]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color="#2d5a27" roughness={0.8} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Wall art — modern abstract panel */}
      <mesh position={[cx, 0.45, cz - zD * 0.42]}>
        <boxGeometry args={[zW * 0.35, 0.2, 0.008]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[cx, 0.45, cz - zD * 0.414]}>
        <boxGeometry args={[zW * 0.37, 0.22, 0.008]} />
        <meshStandardMaterial color="#8b8b8b" metalness={0.8} roughness={0.15} transparent opacity={0.25} />
      </mesh>

      {/* "🏢" floor decal near entrance */}
      <mesh position={[cx + zW * 0.2, 0.03, cz - zD * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.25} />
      </mesh>

      {/* Ceiling light bar — modern linear fixture */}
      <mesh position={[cx, 0.92, cz]}>
        <boxGeometry args={[zW * 0.5, 0.015, 0.06]} />
        <meshStandardMaterial color="#e8ecef" emissive="#e8ecef" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
