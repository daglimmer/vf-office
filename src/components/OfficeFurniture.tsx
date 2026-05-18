import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Oly's Office — Image 3 Style: Curved Monitor Tech Desk ─────────
// Curved widescreen monitor setup, ergonomic chair, multi-screen array,
// keyboard/mouse, code on screens, professional personal workspace

interface OfficeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

const DESK_TOP = '#dee3e9'
const DESK_TRIM = '#c8ced6'
const DESK_LEG = '#9aa3ad'
const MONITOR_BEZEL = '#0d0f14'
const SCREEN_COLOR = '#0f1d35'
const CHAIR_FABRIC = '#2a2d35'
const CHAIR_FRAME = '#444a55'
const ACCENT_CYAN = '#39bae6'

// ─── Curved Monitor Array — 3 monitors in a gentle arc ─────────────
function CurvedMonitorArray({ position }: { position: [number, number, number] }) {
  const scrW = 0.20
  const scrH = 0.12
  const arcRadius = 0.55
  const arcAngle = Math.PI / 10  // ~18° spacing

  const monitors = [
    { angle: -arcAngle, color: '#1a3355' },
    { angle: 0, color: '#1d3a5f' },
    { angle: arcAngle, color: '#1a3355' },
  ]

  return (
    <group position={position}>
      {monitors.map((m, i) => {
        const x = Math.sin(m.angle) * arcRadius
        const z = -Math.cos(m.angle) * arcRadius + arcRadius * 0.6
        return (
          <group key={`cm-${i}`} position={[x, scrH / 2 + 0.03, z]} rotation={[0, m.angle, 0]}>
            {/* Monitor bezel */}
            <mesh castShadow>
              <boxGeometry args={[scrW, scrH, 0.01]} />
              <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.5} roughness={0.15} />
            </mesh>
            {/* Screen surface */}
            <mesh position={[0, 0, 0.006]}>
              <planeGeometry args={[scrW - 0.015, scrH - 0.015]} />
              <meshStandardMaterial
                color={m.color}
                emissive={m.color}
                emissiveIntensity={0.6}
                roughness={0.04}
              />
            </mesh>
            {/* Screen content — code lines */}
            {Array.from({ length: 5 }).map((_, j) => (
              <mesh key={`code-${i}-${j}`} position={[-scrW * 0.18, scrH * 0.2 - j * scrH * 0.12, 0.012]}>
                <boxGeometry args={[0.03 + j * 0.025, 0.002, 0.001]} />
                <meshBasicMaterial
                  color={j % 2 === 0 ? '#44cc88' : '#3399aa'}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            ))}
            {/* Monitor stand — slim VESA arm */}
            <mesh position={[0, -scrH / 2 - 0.02, 0]} castShadow>
              <cylinderGeometry args={[0.007, 0.01, 0.04, 8]} />
              <meshStandardMaterial color="#555a62" metalness={0.75} roughness={0.2} />
            </mesh>
            {/* Thin glow edge */}
            <mesh>
              <boxGeometry args={[scrW + 0.003, scrH + 0.003, 0.002]} />
              <meshBasicMaterial color={ACCENT_CYAN} transparent opacity={0.08} />
            </mesh>
          </group>
        )
      })}

      {/* Monitor base rail — curved metal bar connecting all stands */}
      <mesh position={[0, -0.02, arcRadius * 0.25]}>
        <torusGeometry args={[arcRadius, 0.008, 6, 24, Math.PI * 0.35]} />
        <meshStandardMaterial color="#666a72" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

// ─── Ergonomic Office Chair — high-end mesh back ────────────────────
function ErgonomicChair({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat cushion */}
      <mesh position={[0, 0.26, 0.01]} castShadow>
        <boxGeometry args={[0.16, 0.025, 0.15]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.6} />
      </mesh>
      {/* Seat front curve */}
      <mesh position={[0, 0.26, 0.10]}>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.6} />
      </mesh>
      {/* Backrest — mesh back */}
      <mesh position={[0, 0.43, -0.055]} castShadow>
        <boxGeometry args={[0.15, 0.25, 0.02]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Backrest top curve */}
      <mesh position={[0, 0.56, -0.055]}>
        <cylinderGeometry args={[0.075, 0.075, 0.018, 16]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.55} />
      </mesh>
      {/* Lumbar support */}
      <mesh position={[0, 0.36, -0.04]}>
        <boxGeometry args={[0.09, 0.05, 0.013]} />
        <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.5} />
      </mesh>
      {/* Back frame */}
      <mesh position={[0, 0.57, -0.055]}>
        <boxGeometry args={[0.16, 0.008, 0.024]} />
        <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Side posts */}
      {[-1, 1].map((s) => (
        <mesh key={`sp-${s}`} position={[s * 0.078, 0.43, -0.055]}>
          <boxGeometry args={[0.01, 0.24, 0.024]} />
          <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Armrests */}
      {[-1, 1].map((s) => (
        <group key={`arm-${s}`}>
          <mesh position={[s * 0.075, 0.33, 0.02]} castShadow>
            <boxGeometry args={[0.016, 0.018, 0.09]} />
            <meshStandardMaterial color={CHAIR_FABRIC} metalness={0.03} roughness={0.5} />
          </mesh>
          <mesh position={[s * 0.075, 0.28, 0.02]}>
            <boxGeometry args={[0.008, 0.06, 0.008]} />
            <meshStandardMaterial color={CHAIR_FRAME} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Gas lift */}
      <mesh position={[0, 0.13, 0.01]}>
        <cylinderGeometry args={[0.013, 0.016, 0.22, 10]} />
        <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.1} />
      </mesh>
      {/* 5-star base */}
      <mesh position={[0, 0.035, 0.01]}>
        <cylinderGeometry args={[0.05, 0.06, 0.035, 8]} />
        <meshStandardMaterial color="#444a55" metalness={0.8} roughness={0.2} />
      </mesh>
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh
            key={`cb-${j}`}
            position={[Math.cos(rad) * 0.04, 0.038, Math.sin(rad) * 0.04 + 0.01]}
            rotation={[0, -rad, 0]}
          >
            <boxGeometry args={[0.0015, 0.005, 0.06]} />
            <meshStandardMaterial color="#444a55" metalness={0.8} roughness={0.2} />
          </mesh>
        )
      })}
      {[0, 72, 144, 216, 288].map((deg, j) => {
        const rad = (deg * Math.PI) / 180
        return (
          <mesh key={`cs-${j}`} position={[Math.cos(rad) * 0.068, 0.015, Math.sin(rad) * 0.068 + 0.01]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── Bookshelf — modern floating shelves ────────────────────────────
function Bookshelf({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Side panels */}
      {[-1, 1].map((s) => (
        <mesh key={`bsp-${s}`} position={[s * 0.24, 0.28, 0]} castShadow>
          <boxGeometry args={[0.025, 0.52, 0.22]} />
          <meshStandardMaterial color="#3a2a1f" metalness={0.05} roughness={0.75} />
        </mesh>
      ))}
      {/* Shelves */}
      {[0.06, 0.18, 0.32, 0.44].map((sy, i) => (
        <mesh key={`bs-${i}`} position={[0, sy + 0.08, 0]}>
          <boxGeometry args={[0.48, 0.015, 0.2]} />
          <meshStandardMaterial color="#4a3525" metalness={0.05} roughness={0.7} />
        </mesh>
      ))}
      {/* Books — random colored boxes */}
      {[
        { x: -0.15, y: 0.16, z: 0, w: 0.03, h: 0.06, c: '#553344' },
        { x: -0.10, y: 0.17, z: 0, w: 0.025, h: 0.065, c: '#445566' },
        { x: -0.05, y: 0.155, z: 0, w: 0.028, h: 0.055, c: '#665544' },
        { x: 0.0, y: 0.17, z: 0, w: 0.022, h: 0.06, c: '#334455' },
        { x: 0.05, y: 0.16, z: 0, w: 0.03, h: 0.058, c: '#556644' },
        { x: 0.10, y: 0.155, z: 0, w: 0.026, h: 0.052, c: '#443355' },
        { x: 0.15, y: 0.17, z: 0, w: 0.028, h: 0.062, c: '#445544' },
      ].map((b, i) => (
        <mesh key={`book-${i}`} position={[b.x, b.y, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.12]} />
          <meshStandardMaterial color={b.c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Vertical Status Display Panel ──────────────────────────────────
function StatusPanel({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Panel frame */}
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.35, 0.01]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.5} roughness={0.15} />
      </mesh>
      {/* Panel surface */}
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[0.16, 0.33]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive="#0d1d38"
          emissiveIntensity={0.5}
          roughness={0.04}
        />
      </mesh>
      {/* Data lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`dl-${i}`} position={[-0.05, 0.12 - i * 0.04, 0.012]}>
          <boxGeometry args={[0.015 + Math.random() * 0.07, 0.002, 0.001]} />
          <meshBasicMaterial color={i < 5 ? '#44cc88' : '#3399bb'} transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Circular indicators */}
      {[0, 1, 2].map((_, i) => (
        <mesh key={`ci-${i}`} position={[0.05, 0.12 - i * 0.06, 0.012]}>
          <ringGeometry args={[0.012, 0.015, 16]} />
          <meshBasicMaterial color={i === 0 ? '#44ff88' : '#3388aa'} transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Frame glow */}
      <mesh>
        <boxGeometry args={[0.19, 0.36, 0.003]} />
        <meshBasicMaterial color={ACCENT_CYAN} transparent opacity={0.08} />
      </mesh>
    </group>
  )
}


// ─── MAIN: Oly's Office Component ───────────────────────────────────
export default function OfficeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: OfficeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const zW = colSpan * cellW
  const zD = rowSpan * cellD

  const deskW = 1.35
  const deskD = 0.7
  const deskY = 0.38

  return (
    <group>
      {/* ─── Floor accent — polished area ─── */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.8, zD * 0.8]} />
        <meshStandardMaterial color="#141c28" roughness={0.2} metalness={0.6} transparent opacity={0.45} />
      </mesh>

      {/* ─── Desk — generous tech workspace ─── */}
      <mesh position={[cx + 0.05, deskY, cz - 0.05]} castShadow receiveShadow>
        <boxGeometry args={[deskW, 0.025, deskD]} />
        <meshStandardMaterial color={DESK_TOP} metalness={0.1} roughness={0.22} />
      </mesh>
      {/* Desk edge trim */}
      <mesh position={[cx + 0.05, deskY + 0.005, cz - 0.05]}>
        <boxGeometry args={[deskW + 0.018, 0.003, deskD + 0.018]} />
        <meshStandardMaterial color={DESK_TRIM} metalness={0.15} roughness={0.25} />
      </mesh>

      {/* Desk legs — modern tapered metal */}
      {[
        [-deskW * 0.44, -deskD * 0.42],
        [deskW * 0.44, -deskD * 0.42],
        [-deskW * 0.44, deskD * 0.42],
        [deskW * 0.44, deskD * 0.42],
      ].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[cx + 0.05 + lx, deskY / 2, cz - 0.05 + lz]} castShadow>
          <cylinderGeometry args={[0.014, 0.017, deskY, 10]} />
          <meshStandardMaterial color={DESK_LEG} metalness={0.7} roughness={0.22} />
        </mesh>
      ))}

      {/* Cable management tray under desk */}
      <mesh position={[cx + 0.05, 0.08, cz - 0.05 - deskD * 0.25]}>
        <boxGeometry args={[deskW * 0.6, 0.025, 0.10]} />
        <meshStandardMaterial color="#1a1c22" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* ─── Curved Monitor Array ─── */}
      <CurvedMonitorArray position={[cx + 0.05, deskY, cz - 0.05 - deskD * 0.22]} />

      {/* ─── Side reference monitor (vertical) ─── */}
      <mesh position={[cx + 0.05 - deskW * 0.38, deskY + 0.28, cz - 0.05 - deskD * 0.22]} castShadow>
        <boxGeometry args={[0.11, 0.16, 0.01]} />
        <meshStandardMaterial color={MONITOR_BEZEL} metalness={0.45} roughness={0.15} />
      </mesh>
      <mesh position={[cx + 0.05 - deskW * 0.38, deskY + 0.28, cz - 0.05 - deskD * 0.22 + 0.006]}>
        <planeGeometry args={[0.09, 0.14]} />
        <meshStandardMaterial color="#0f1d35" emissive="#152545" emissiveIntensity={0.4} roughness={0.04} />
      </mesh>
      {/* Stand */}
      <mesh position={[cx + 0.05 - deskW * 0.38, deskY + 0.15, cz - 0.05 - deskD * 0.22]} castShadow>
        <cylinderGeometry args={[0.006, 0.008, 0.04, 8]} />
        <meshStandardMaterial color="#555a62" metalness={0.75} roughness={0.2} />
      </mesh>

      {/* ─── Ergonomic chair — behind desk, facing monitors ─── */}
      <ErgonomicChair
        position={[cx + 0.05, 0, cz + 0.35]}
        rotation={[0, Math.PI, 0]}
      />

      {/* ─── Keyboard + mouse area on desk ─── */}
      <mesh position={[cx + 0.05, deskY + 0.015, cz + 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.008]} />
        <meshStandardMaterial color="#2a2d35" metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Keyboard backlight glow */}
      <mesh position={[cx + 0.05, deskY + 0.018, cz + 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.17, 0.05]} />
        <meshBasicMaterial color={ACCENT_CYAN} transparent opacity={0.1} />
      </mesh>

      {/* Mouse pad */}
      <mesh position={[cx + 0.05 + 0.08, deskY + 0.014, cz + 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 0.045]} />
        <meshStandardMaterial color="#1a222a" roughness={0.7} />
      </mesh>

      {/* Coffee mug */}
      <group position={[cx + 0.05 - 0.08, deskY + 0.025, cz + 0.01]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.018, 0.016, 0.04, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
        </mesh>
        <mesh position={[0.018, 0.005, 0]}>
          <torusGeometry args={[0.012, 0.004, 8, 8, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
        </mesh>
        {/* Steam wisps — subtle */}
        <mesh position={[0, 0.045, 0]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#8899bb" transparent opacity={0.08} />
        </mesh>
      </group>

      {/* Notepad / tablet */}
      <mesh position={[cx + 0.05 - 0.06, deskY + 0.016, cz - 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.004]} />
        <meshStandardMaterial color="#1a2030" roughness={0.3} />
      </mesh>

      {/* ─── Bookshelf on left wall ─── */}
      <Bookshelf position={[cx - zW * 0.42, 0, cz - 0.1]} />

      {/* ─── Vertical Status Display Panel on right wall ─── */}
      <StatusPanel
        position={[cx + zW * 0.40, 0.35, cz - 0.05]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ─── Filing cabinet in corner ─── */}
      <mesh position={[cx + zW * 0.30, 0.24, cz + zD * 0.38]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.12]} />
        <meshStandardMaterial color="#484f5a" metalness={0.4} roughness={0.35} />
      </mesh>
      {[0.06, 0.16, 0.26].map((dy, i) => (
        <mesh key={`dr-${i}`} position={[cx + zW * 0.30, dy + 0.12, cz + zD * 0.38 + 0.06]}>
          <boxGeometry args={[0.04, 0.006, 0.01]} />
          <meshStandardMaterial color="#999" metalness={0.75} roughness={0.2} />
        </mesh>
      ))}

      {/* ─── Small plant */}
      <mesh position={[cx - zW * 0.35, 0.14, cz + zD * 0.38]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.10, 8]} />
        <meshStandardMaterial color="#4a3025" />
      </mesh>
      <mesh position={[cx - zW * 0.35, 0.25, cz + zD * 0.38]} castShadow>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {/* ─── Ceiling light bar */}
      <mesh position={[cx + 0.05, 0.92, cz - 0.05]}>
        <boxGeometry args={[deskW * 0.7, 0.012, 0.05]} />
        <meshStandardMaterial color="#e8edf0" emissive="#dde4ea" emissiveIntensity={0.4} roughness={0.05} />
      </mesh>

      {/* ─── Neon accent strip — above desk on wall */}
      <mesh position={[cx + 0.05, 0.70, cz - 0.05 - zD * 0.45]}>
        <boxGeometry args={[deskW * 0.6, 0.005, 0.005]} />
        <meshStandardMaterial color={ACCENT_CYAN} emissive={ACCENT_CYAN} emissiveIntensity={1.2} />
      </mesh>

      {/* ─── "⚙️ OLY'S OFFICE" label near entrance ─── */}
      <Text
        position={[cx + zW * 0.15, 0.08, cz + zD * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#55aacc"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#080c16"
      >
        ⚙️ OLY'S OFFICE
      </Text>
    </group>
  )
}
