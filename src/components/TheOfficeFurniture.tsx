import React from 'react'

// ─── The Office Furniture — Image 34 Reference: Minimalist Dual-Monitor Open-Plan ──
// 2 columns × 3 rows = 6 workstations
// Each: white desk, dual monitors, blue ergonomic chair, dark reflective floor

interface TheOfficeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const DESK_TOP   = '#f0f2f5'
const DESK_LEG   = '#d0d3d8'
const MONITOR_BEZEL = '#0d0f14'
const SCREEN_COLOR  = '#1a2d4a'

export default function TheOfficeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: TheOfficeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const zW = colSpan * cellW
  const zD = rowSpan * cellD

  const COLS = 2
  const ROWS = 3
  const colSpacing = zW / (COLS + 1)
  const rowSpacing = zD / (ROWS + 1)

  const deskW = 0.90
  const deskD = 0.48
  const deskY = 0.38

  const colOffsets = [ -colSpacing / 2, colSpacing / 2 ]
  const rowOffsets = [ -rowSpacing, 0, rowSpacing ]

  const desks: { dx: number; dz: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      desks.push({ dx: colOffsets[c], dz: rowOffsets[r] })
    }
  }

  return (
    <group>
      {/* ─── Dark reflective polished floor mat ─── */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.88, zD * 0.88]} />
        <meshStandardMaterial color="#1a1e24" roughness={0.18} metalness={0.65} transparent opacity={0.45} />
      </mesh>

      {desks.map((d, i) => (
        <group key={`desk-${i}`} position={[cx + d.dx, 0, cz + d.dz]}>
          {/* ─── White minimalist desk top ─── */}
          <mesh position={[0, deskY, 0]} castShadow>
            <boxGeometry args={[deskW, 0.018, deskD]} />
            <meshStandardMaterial color={DESK_TOP} metalness={0.08} roughness={0.25} />
          </mesh>

          {/* Desk edge trim */}
          <mesh position={[0, deskY + 0.009, 0]}>
            <boxGeometry args={[deskW + 0.014, 0.003, deskD + 0.014]} />
            <meshStandardMaterial color="#d8dce0" metalness={0.1} roughness={0.28} />
          </mesh>

          {/* ─── Desk legs — 4 slim square posts ─── */}
          {[
            [-deskW * 0.44, -deskD * 0.44],
            [ deskW * 0.44, -deskD * 0.44],
            [-deskW * 0.44,  deskD * 0.44],
            [ deskW * 0.44,  deskD * 0.44],
          ].map(([lx, lz], j) => (
            <mesh key={`leg-${i}-${j}`} position={[lx, 0.19, lz]} castShadow>
              <boxGeometry args={[0.022, 0.38, 0.022]} />
              <meshStandardMaterial color={DESK_LEG} metalness={0.5} roughness={0.25} />
            </mesh>
          ))}

          {/* Horizontal leg brace — front */}
          <mesh position={[0, 0.06, -deskD * 0.44]}>
            <boxGeometry args={[deskW * 0.70, 0.008, 0.008]} />
            <meshStandardMaterial color={DESK_LEG} metalness={0.7} roughness={0.2} />
          </mesh>

          {/* ─── DUAL Monitors — two side-by-side flat screens ─── */}
          {[-1, 1].map((side, mi) => {
            const mx = side * 0.085
            const scrW = 0.16
            const scrH = 0.10
            return (
              <group key={`mon-${mi}`} position={[mx, deskY + scrH / 2 + 0.04, -deskD * 0.20]}>
                {/* Monitor bezel */}
                <mesh castShadow>
                  <boxGeometry args={[scrW, scrH, 0.007]} />
                  <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.45} roughness={0.15} />
                </mesh>
                {/* Screen surface */}
                <mesh position={[0, 0, 0.004]}>
                  <planeGeometry args={[scrW - 0.012, scrH - 0.012]} />
                  <meshStandardMaterial
                    color={SCREEN_COLOR}
                    emissive={SCREEN_COLOR}
                    emissiveIntensity={0.4}
                    roughness={0.04}
                  />
                </mesh>
                {/* Screen content — data bars */}
                {Array.from({ length: 3 }).map((_, j) => (
                  <mesh key={`bar-${mi}-${j}`} position={[-scrW * 0.2 + j * 0.05, -scrH * 0.1 + (0.02 + j * 0.015), 0.008]}>
                    <boxGeometry args={[0.025, 0.008 + j * 0.01, 0.001]} />
                    <meshBasicMaterial color={j === 0 ? '#44cc88' : '#3399bb'} transparent opacity={0.6} />
                  </mesh>
                ))}
                {/* Monitor stand — slim arm */}
                <mesh position={[0, -scrH / 2 - 0.02, -0.004]} castShadow>
                  <cylinderGeometry args={[0.006, 0.009, 0.035, 8]} />
                  <meshStandardMaterial color="#555a62" metalness={0.75} roughness={0.2} />
                </mesh>
                <mesh position={[0, -scrH / 2 - 0.04, -0.004]}>
                  <cylinderGeometry args={[0.022, 0.024, 0.005, 12]} />
                  <meshStandardMaterial color="#444a50" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>
            )
          })}

          {/* ─── Keyboard ─── */}
          <mesh position={[0, deskY + 0.011, deskD * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.14, 0.04, 0.005]} />
            <meshStandardMaterial color="#2a2d30" metalness={0.1} roughness={0.5} />
          </mesh>
          <mesh position={[0, deskY + 0.014, deskD * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.13, 0.035]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.06} />
          </mesh>

          {/* Mouse pad */}
          <mesh position={[0.06, deskY + 0.012, deskD * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 0.035]} />
            <meshStandardMaterial color="#252a30" roughness={0.7} />
          </mesh>

          {/* ─── Blue ergonomic chair — behind desk, facing monitors ─── */}
          <group position={[0, 0, deskD * 0.32]} rotation={[0, Math.PI, 0]}>
            {/* Seat — blue fabric */}
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[0.13, 0.018, 0.12]} />
              <meshStandardMaterial color="#3366aa" metalness={0.03} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.24, 0.07]}>
              <cylinderGeometry args={[0.06, 0.06, 0.018, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#3366aa" metalness={0.03} roughness={0.55} />
            </mesh>
            {/* Backrest — blue mesh */}
            <mesh position={[0, 0.38, -0.045]} castShadow>
              <boxGeometry args={[0.12, 0.20, 0.016]} />
              <meshStandardMaterial color="#3366aa" metalness={0.03} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.49, -0.045]}>
              <cylinderGeometry args={[0.06, 0.06, 0.014, 16]} />
              <meshStandardMaterial color="#3366aa" metalness={0.03} roughness={0.5} />
            </mesh>
            {/* Lumbar support */}
            <mesh position={[0, 0.32, -0.032]}>
              <boxGeometry args={[0.07, 0.035, 0.01]} />
              <meshStandardMaterial color="#2a5599" metalness={0.03} roughness={0.5} />
            </mesh>
            {/* Frame — white/grey */}
            <mesh position={[0, 0.50, -0.045]}>
              <boxGeometry args={[0.13, 0.006, 0.02]} />
              <meshStandardMaterial color="#d0d4d8" metalness={0.4} roughness={0.3} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={`sp-${s}`} position={[s * 0.062, 0.38, -0.045]}>
                <boxGeometry args={[0.008, 0.20, 0.02]} />
                <meshStandardMaterial color="#d0d4d8" metalness={0.4} roughness={0.3} />
              </mesh>
            ))}
            {/* Gas lift */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.011, 0.014, 0.18, 10]} />
              <meshStandardMaterial color="#9aa0a8" metalness={0.85} roughness={0.1} />
            </mesh>
            {/* 5-star base */}
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.025, 8]} />
              <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.2} />
            </mesh>
            {[0, 72, 144, 216, 288].map((deg, j) => {
              const rad = (deg * Math.PI) / 180
              return (
                <group key={`cb-${j}`}>
                  <mesh
                    position={[Math.cos(rad) * 0.035, 0.032, Math.sin(rad) * 0.035]}
                    rotation={[0, -rad, 0]}
                  >
                    <boxGeometry args={[0.0012, 0.004, 0.05]} />
                    <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[Math.cos(rad) * 0.058, 0.013, Math.sin(rad) * 0.058]}>
                    <sphereGeometry args={[0.008, 6, 6]} />
                    <meshStandardMaterial color="#111" metalness={0.6} roughness={0.3} />
                  </mesh>
                </group>
              )
            })}
          </group>

          {/* Coffee mug (some desks) */}
          {i % 3 === 0 && (
            <group position={[-0.05, deskY + 0.022, -deskD * 0.05]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.015, 0.013, 0.032, 10]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
              </mesh>
              <mesh position={[0.015, 0.003, 0]}>
                <torusGeometry args={[0.010, 0.003, 8, 8, Math.PI]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
              </mesh>
            </group>
          )}

          {/* Small plant (alternating desks) */}
          {i % 2 === 1 && (
            <group position={[0.06, deskY + 0.022, -deskD * 0.05]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.012, 0.014, 0.022, 8]} />
                <meshStandardMaterial color="#5a3a2a" />
              </mesh>
              <mesh position={[0, 0.022, 0]} castShadow>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshStandardMaterial color="#2d5a27" roughness={0.8} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* ─── Wall art — modern abstract panel on back wall ─── */}
      <group position={[cx, 0.45, cz - zD * 0.42]}>
        <mesh>
          <boxGeometry args={[zW * 0.30, 0.18, 0.007]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.10} />
        </mesh>
        <mesh position={[0, 0, 0.004]}>
          <boxGeometry args={[zW * 0.32, 0.20, 0.007]} />
          <meshStandardMaterial color="#8b8b8b" metalness={0.8} roughness={0.15} transparent opacity={0.2} />
        </mesh>
        {/* Two cyan LED accent strips flanking art */}
        {[-zW * 0.18, zW * 0.18].map((lx, li) => (
          <mesh key={`awled-${li}`} position={[lx, 0, 0.004]}>
            <boxGeometry args={[0.006, 0.16, 0.006]} />
            <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={1.2} roughness={0.03} />
          </mesh>
        ))}
        <pointLight position={[0, 0, 0.12]} intensity={0.4} color="#4488ff" distance={2} />
      </group>

      {/* ─── Ceiling light bar — modern linear fixture ─── */}
      <mesh position={[cx, 0.93, cz]}>
        <boxGeometry args={[zW * 0.45, 0.012, 0.05]} />
        <meshStandardMaterial color="#e8ecef" emissive="#e8ecef" emissiveIntensity={0.3} />
      </mesh>

      {/* ─── "🏢" floor decal near entrance ─── */}
      <mesh position={[cx + zW * 0.2, 0.03, cz - zD * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.18]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}
