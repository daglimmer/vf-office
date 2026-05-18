import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════
// Lounge — Luxurious Symmetrical Lounge (Image 36 Ref)
// ═══════════════════════════════════════════════════════════════════
// Bilateral symmetry with central fireplace, high ceilings with black
// recessed lighting troughs, light oak wall paneling, floor-to-ceiling
// windows, polished stone floor. Taupe sofas, teal velvet chairs,
// alabaster sconces, sheer curtains. Professional corporate luxury.

interface LoungeFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// ─── Color Palette (Ref Image 36) ───────────────────────────────────
const STONE_CREAM = '#e8e2d8'
const STONE_FLOOR = '#c8c4bc'
const OAK_WOOD = '#c4a882'
const OAK_LIGHT = '#d4bc96'
const TAUPE_FABRIC = '#9e8e7e'
const TEAL_VELVET = '#4a7a8a'
const CHARCOAL = '#2a2a2a'
const MATTE_BLACK = '#1a1a1a'
const LIMESTONE = '#ded5c8'
const BRASS = '#c4a866'
const RUG_BLUE = '#7a8a9a'
const RUG_SILK = '#8a96a6'
const FLAME_ORANGE = '#ff8833'

// ─── Central Fireplace — floor-to-ceiling limestone monolith ────────
function FireplaceMonolith() {
  const flameRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (flameRef.current) {
      const fm = flameRef.current.material as THREE.MeshStandardMaterial
      fm.emissiveIntensity = 0.6 + Math.sin(t * 4.5) * 0.25 + Math.sin(t * 7.3) * 0.15
    }
    if (glowRef.current) {
      const gm = glowRef.current.material as THREE.MeshBasicMaterial
      gm.opacity = 0.15 + Math.sin(t * 3.0) * 0.06
    }
  })

  const fpHeight = 1.0
  const fpWidth = 0.70
  const fpDepth = 0.25

  return (
    <group>
      {/* Main monolith body — honed limestone */}
      <mesh position={[0, fpHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fpWidth, fpHeight, fpDepth]} />
        <meshStandardMaterial color={LIMESTONE} roughness={0.55} metalness={0.02} />
      </mesh>

      {/* Stone vein details — subtle horizontal bands */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`vein-${i}`} position={[0, fpHeight * 0.15 + i * fpHeight * 0.15, fpDepth / 2 + 0.002]}>
          <boxGeometry args={[fpWidth * 0.95, 0.004, 0.004]} />
          <meshStandardMaterial color="#d5ccbe" roughness={0.60} />
        </mesh>
      ))}

      {/* Two-tier floating hearth plinth */}
      <mesh position={[0, 0.035, fpDepth / 2 + 0.08]} castShadow>
        <boxGeometry args={[fpWidth - 0.04, 0.06, 0.12]} />
        <meshStandardMaterial color={LIMESTONE} roughness={0.50} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.075, fpDepth / 2 + 0.14]}>
        <boxGeometry args={[fpWidth - 0.10, 0.025, 0.10]} />
        <meshStandardMaterial color="#d5ccbe" roughness={0.50} metalness={0.02} />
      </mesh>

      {/* Linear firebox recess */}
      <mesh position={[0, 0.25, fpDepth / 2 + 0.005]}>
        <boxGeometry args={[fpWidth * 0.55, 0.14, 0.04]} />
        <meshStandardMaterial color={MATTE_BLACK} roughness={0.70} metalness={0.15} />
      </mesh>

      {/* Firebox interior — warm glow */}
      <mesh ref={glowRef} position={[0, 0.25, fpDepth / 2 + 0.018]}>
        <planeGeometry args={[fpWidth * 0.48, 0.10]} />
        <meshBasicMaterial
          color={FLAME_ORANGE}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Flame ribbon — orange emissive strip */}
      <mesh ref={flameRef} position={[0, 0.22, fpDepth / 2 + 0.022]}>
        <boxGeometry args={[fpWidth * 0.45, 0.025, 0.015]} />
        <meshStandardMaterial
          color={FLAME_ORANGE}
          emissive={FLAME_ORANGE}
          emissiveIntensity={0.70}
          roughness={0.10}
        />
      </mesh>

      {/* White decorative stones in firebox */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`stone-${i}`} position={[
          (Math.random() - 0.5) * fpWidth * 0.35,
          0.19 + Math.random() * 0.03,
          fpDepth / 2 + 0.022,
        ]}>
          <sphereGeometry args={[0.008 + Math.random() * 0.006, 5, 5]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.30} />
        </mesh>
      ))}

      {/* Fireplace glow light */}
      <pointLight position={[0, 0.25, fpDepth / 2 + 0.20]} intensity={1.2} color={FLAME_ORANGE} distance={3.5} />
    </group>
  )
}

// ─── Taupe Chaise Sofa — armless low-profile ────────────────────────
function ChaiseSofa({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat base — wide, low, plush */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.22]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.70} />
      </mesh>
      {/* Seat cushion top */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.52, 0.04, 0.20]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.01} roughness={0.75} />
      </mesh>
      {/* Backrest — angled */}
      <mesh position={[0, 0.20, -0.09]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.22, 0.06]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.68} />
      </mesh>
      {/* Backrest top roll */}
      <mesh position={[0, 0.33, -0.12]} castShadow>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 12]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.70} />
      </mesh>
      {/* Dark wood base */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.53, 0.025, 0.20]} />
        <meshStandardMaterial color="#3a3028" roughness={0.60} />
      </mesh>
      {/* Low legs */}
      {[[-0.24, -0.08], [0.24, -0.08], [-0.24, 0.08], [0.24, 0.08]].map(([lx, lz], i) => (
        <mesh key={`csl-${i}`} position={[lx, 0.01, lz]}>
          <cylinderGeometry args={[0.012, 0.014, 0.025, 8]} />
          <meshStandardMaterial color="#3a3028" roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Three-Seater Sofa — traditional taupe ─────────────────────────
function ThreeSeaterSofa({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.70, 0.08, 0.22]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.70} />
      </mesh>
      {/* Seat cushions (3) */}
      {[-0.20, 0, 0.20].map((cx, i) => (
        <mesh key={`sc-${i}`} position={[cx, 0.18, 0]} castShadow>
          <boxGeometry args={[0.20, 0.04, 0.20]} />
          <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.01} roughness={0.75} />
        </mesh>
      ))}
      {/* Backrest */}
      <mesh position={[0, 0.22, -0.09]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.70, 0.24, 0.06]} />
        <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.68} />
      </mesh>
      {/* Armrests */}
      {[-0.37, 0.37].map((ax, i) => (
        <mesh key={`arm-${i}`} position={[ax, 0.20, -0.02]} castShadow>
          <boxGeometry args={[0.06, 0.12, 0.18]} />
          <meshStandardMaterial color={TAUPE_FABRIC} metalness={0.02} roughness={0.68} />
        </mesh>
      ))}
      {/* Dark wood base */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.68, 0.025, 0.20]} />
        <meshStandardMaterial color="#3a3028" roughness={0.60} />
      </mesh>
    </group>
  )
}

// ─── Wingback Chair — teal velvet ───────────────────────────────────
function WingbackChair({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.18]} />
        <meshStandardMaterial color={TEAL_VELVET} metalness={0.02} roughness={0.60} />
      </mesh>
      {/* Seat cushion */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.16, 0.035, 0.16]} />
        <meshStandardMaterial color={TEAL_VELVET} metalness={0.01} roughness={0.65} />
      </mesh>
      {/* High back */}
      <mesh position={[0, 0.32, -0.07]} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.05]} />
        <meshStandardMaterial color={TEAL_VELVET} metalness={0.02} roughness={0.60} />
      </mesh>
      {/* Back top curve */}
      <mesh position={[0, 0.46, -0.07]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 12]} />
        <meshStandardMaterial color={TEAL_VELVET} metalness={0.02} roughness={0.62} />
      </mesh>
      {/* Wing sides */}
      {[-0.09, 0.09].map((wx, i) => (
        <mesh key={`wing-${i}`} position={[wx, 0.35, -0.07]} castShadow>
          <boxGeometry args={[0.03, 0.18, 0.05]} />
          <meshStandardMaterial color={TEAL_VELVET} metalness={0.02} roughness={0.58} />
        </mesh>
      ))}
      {/* Silver lumbar pillow */}
      <mesh position={[0, 0.26, -0.04]}>
        <boxGeometry args={[0.10, 0.04, 0.025]} />
        <meshStandardMaterial color="#c0c4c8" metalness={0.10} roughness={0.45} />
      </mesh>
      {/* Dark wood legs */}
      {[[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]].map(([lx, lz], i) => (
        <mesh key={`wbl-${i}`} position={[lx, 0.02, lz]}>
          <cylinderGeometry args={[0.010, 0.012, 0.06, 8]} />
          <meshStandardMaterial color="#3a3028" roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Neutral Lounge Chair — grey/beige rounded ─────────────────────
function LoungeChair({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.16]} />
        <meshStandardMaterial color="#b8b4ae" metalness={0.02} roughness={0.65} />
      </mesh>
      {/* Seat cushion rounded */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.03, 16]} />
        <meshStandardMaterial color="#c4c0ba" metalness={0.01} roughness={0.70} />
      </mesh>
      {/* Backrest — rounded low */}
      <mesh position={[0, 0.20, -0.06]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.14, 0.05]} />
        <meshStandardMaterial color="#b8b4ae" metalness={0.02} roughness={0.65} />
      </mesh>
      {/* Dark wood legs */}
      {[[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]].map(([lx, lz], i) => (
        <mesh key={`lcl-${i}`} position={[lx, 0.02, lz]}>
          <cylinderGeometry args={[0.010, 0.012, 0.07, 8]} />
          <meshStandardMaterial color="#3a3028" roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Coffee Table — light oak with dark metal frame ────────────────
function CoffeeTable({ position, size }: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  return (
    <group position={position}>
      {/* Table top — light oak */}
      <mesh position={[0, size[1], 0]} castShadow>
        <boxGeometry args={[size[0], 0.025, size[2]]} />
        <meshStandardMaterial color={OAK_LIGHT} roughness={0.45} />
      </mesh>
      {/* Dark metal frame border */}
      <mesh position={[0, size[1] + 0.012, 0]}>
        <boxGeometry args={[size[0] + 0.008, 0.004, size[2] + 0.008]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.60} roughness={0.30} />
      </mesh>
      {/* Metal legs */}
      {[
        [-size[0] / 2 + 0.04, -size[2] / 2 + 0.04],
        [size[0] / 2 - 0.04, -size[2] / 2 + 0.04],
        [-size[0] / 2 + 0.04, size[2] / 2 - 0.04],
        [size[0] / 2 - 0.04, size[2] / 2 - 0.04],
      ].map(([lx, lz], i) => (
        <mesh key={`ctl-${i}`} position={[lx, size[1] / 2, lz]}>
          <cylinderGeometry args={[0.012, 0.014, size[1], 8]} />
          <meshStandardMaterial color={CHARCOAL} metalness={0.65} roughness={0.28} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Floor Lamp — black stem, cream shade ──────────────────────────
function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stem */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.01, 0.012, 0.70, 8]} />
        <meshStandardMaterial color={MATTE_BLACK} metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Shade — large cream cylinder */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.16, 16]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.50} emissive="#f5f0e5" emissiveIntensity={0.15} />
      </mesh>
      {/* Base — weighted disc */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.02, 16]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.50} roughness={0.30} />
      </mesh>
      {/* Lamp glow */}
      <pointLight position={[0, 0.70, 0]} intensity={0.5} color="#f5e8d0" distance={2.5} />
    </group>
  )
}

// ─── Wall Sconce — alabaster block ──────────────────────────────────
function WallSconce({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Sconce body — frosted alabaster */}
      <mesh position={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[0.06, 0.18, 0.04]} />
        <meshStandardMaterial
          color="#e8e0d0"
          roughness={0.40}
          emissive="#f5f0e0"
          emissiveIntensity={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Back plate — dark metal */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.07, 0.20, 0.01]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.60} roughness={0.35} />
      </mesh>
      {/* Sconce glow */}
      <pointLight position={[0, 0, 0.15]} intensity={0.3} color="#f5ead5" distance={1.5} />
    </group>
  )
}

// ─── Window Wall Panel — floor-to-ceiling glass + mullions ─────────
function WindowPanel({ position, width, height, rotation }: {
  position: [number, number, number]
  width: number
  height: number
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Dark charcoal mullion frame */}
      <mesh>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.50} roughness={0.35} />
      </mesh>
      {/* Glass panes (2 panes per window section) */}
      {[-width * 0.22, width * 0.22].map((gx, i) => (
        <mesh key={`gp-${i}`} position={[gx, 0, 0.01]}>
          <planeGeometry args={[width * 0.35, height * 0.88]} />
          <meshStandardMaterial
            color="#3a4050"
            metalness={0.05}
            roughness={0.10}
            transparent
            opacity={0.50}
          />
        </mesh>
      ))}
      {/* Horizontal mullion divider */}
      <mesh position={[0, height * 0.12, 0.005]}>
        <boxGeometry args={[width, 0.008, 0.02]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.50} roughness={0.35} />
      </mesh>
      {/* Sheer curtain — translucent panel at sides */}
      <mesh position={[width * 0.48, 0, 0.015]}>
        <planeGeometry args={[width * 0.08, height * 0.85]} />
        <meshStandardMaterial
          color="#d8d4d0"
          transparent
          opacity={0.22}
          roughness={0.70}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-width * 0.48, 0, 0.015]}>
        <planeGeometry args={[width * 0.08, height * 0.85]} />
        <meshStandardMaterial
          color="#d8d4d0"
          transparent
          opacity={0.22}
          roughness={0.70}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ─── Wood Wall Panel — light oak veneer ────────────────────────────
function WoodWallPanel({ position, width, height, rotation }: {
  position: [number, number, number]
  width: number
  height: number
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main panel surface */}
      <mesh>
        <boxGeometry args={[width, height, 0.015]} />
        <meshStandardMaterial color={OAK_WOOD} roughness={0.50} />
      </mesh>
      {/* Horizontal reveal grooves */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`reveal-${i}`} position={[0, -height * 0.30 + i * height * 0.20, 0.01]}>
          <boxGeometry args={[width * 0.90, 0.003, 0.006]} />
          <meshStandardMaterial color="#b09870" roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Black Recessed Ceiling Trough — lighting channel ──────────────
function CeilingTrough({ position, width, depth }: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  return (
    <group position={position}>
      {/* Trough body — deep matte black recess */}
      <mesh>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color={MATTE_BLACK} roughness={0.65} />
      </mesh>
      {/* Inner recess — even darker */}
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[width * 0.85, 0.015, depth * 0.75]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.80} />
      </mesh>
      {/* LED spotlights inside trough */}
      {Array.from({ length: 3 }).map((_, i) => (
        <group key={`spot-${i}`} position={[-width * 0.30 + i * width * 0.30, -0.02, 0]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.018, 0.015, 12]} />
            <meshStandardMaterial color="#444" metalness={0.60} roughness={0.30} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.010, 0.010, 0.005, 12]} />
            <meshStandardMaterial color="#fff8e8" emissive="#fff5e0" emissiveIntensity={0.6} />
          </mesh>
          {/* Downlight */}
          <pointLight position={[0, -0.20, 0]} intensity={0.25} color="#f5ead5" distance={1.5} />
        </group>
      ))}
    </group>
  )
}

// ─── Small Side Table — dark wood/metal ────────────────────────────
function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Top */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.08, 0.015, 0.08]} />
        <meshStandardMaterial color={OAK_LIGHT} roughness={0.50} />
      </mesh>
      {/* Leg */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.012, 0.015, 0.16, 8]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.55} roughness={0.30} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.015, 12]} />
        <meshStandardMaterial color={CHARCOAL} metalness={0.50} roughness={0.32} />
      </mesh>
      {/* Small floral — ceramic pot */}
      <group position={[0.02, 0.15, 0.02]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.018, 0.015, 0.03, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.35} />
        </mesh>
        {/* Tropical leaves */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2
          return (
            <mesh key={`fl-${i}`} position={[Math.cos(angle) * 0.012, 0.03, Math.sin(angle) * 0.012]} rotation={[0.3, angle, 0.2]}>
              <sphereGeometry args={[0.015, 6, 4]} />
              <meshStandardMaterial color="#3a8844" roughness={0.70} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

// ─── Area Rug — dusty blue rectangular ─────────────────────────────
function AreaRug({ position, width, depth }: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  return (
    <group position={position}>
      {/* Rug base — dusty blue */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={RUG_BLUE} roughness={0.85} />
      </mesh>
      {/* Silk sheen overlay */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.90, depth * 0.90]} />
        <meshStandardMaterial
          color={RUG_SILK}
          roughness={0.70}
          transparent
          opacity={0.35}
        />
      </mesh>
      {/* Border band */}
      <mesh position={[0, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(width, depth) * 0.48, Math.min(width, depth) * 0.50, 4]} />
        <meshStandardMaterial color="#6a7a8a" roughness={0.75} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ─── Decorative Books — on coffee table ────────────────────────────
function CoffeeTableBooks({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stack of books */}
      {[
        { y: 0.008, color: '#dd6633', w: 0.06, h: 0.008 },
        { y: 0.016, color: '#3355aa', w: 0.07, h: 0.007 },
        { y: 0.023, color: '#44aa66', w: 0.055, h: 0.006 },
      ].map((b, i) => (
        <mesh key={`book-${i}`} position={[0, b.y, 0]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.05]} />
          <meshStandardMaterial color={b.color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Lounge Component
// ═══════════════════════════════════════════════════════════════════
export default function LoungeFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: LoungeFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const roomW = colSpan * cellW
  const roomD = rowSpan * cellD

  // Fireplace at far end (north/deeper z, negative in our coords)
  const fpZ = -roomD * 0.38

  return (
    <group>
      {/* ═══════════════════════════════════════════════════════════
          POLISHED STONE FLOOR — light grey, reflective
          ═══════════════════════════════════════════════════════════ */}
      <mesh position={[cx, 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.88, roomD * 0.88]} />
        <meshStandardMaterial
          color={STONE_FLOOR}
          roughness={0.12}
          metalness={0.10}
        />
      </mesh>

      {/* Floor reflection sheen */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomW * 0.82, roomD * 0.82]} />
        <meshStandardMaterial
          color="#d0ccc4"
          roughness={0.08}
          metalness={0.08}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════
          HIGH CEILING — black recessed lighting troughs
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx, 0.95, cz]}>
        {/* Perimeter U-shaped trough */}
        {/* Left side */}
        <CeilingTrough position={[-roomW * 0.38, 0, 0]} width={0.08} depth={roomD * 0.75} />
        {/* Right side */}
        <CeilingTrough position={[roomW * 0.38, 0, 0]} width={0.08} depth={roomD * 0.75} />
        {/* Back side (above fireplace) */}
        <CeilingTrough position={[0, 0, -roomD * 0.38]} width={roomW * 0.75} depth={0.08} />
        {/* Central linear trough */}
        <CeilingTrough position={[0, 0, roomD * 0.05]} width={roomW * 0.55} depth={0.06} />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          WOOD WALL PANELING — light oak, left and right walls
          ═══════════════════════════════════════════════════════════ */}
      <WoodWallPanel
        position={[cx - roomW * 0.42, 0.35, cz]}
        width={0.65}
        height={0.65}
        rotation={[0, Math.PI / 2, 0]}
      />
      <WoodWallPanel
        position={[cx + roomW * 0.42, 0.35, cz]}
        width={0.65}
        height={0.65}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Wood pillar accents */}
      <mesh position={[cx - roomW * 0.32, 0.35, cz - roomD * 0.15]} castShadow>
        <boxGeometry args={[0.06, 0.65, 0.06]} />
        <meshStandardMaterial color={OAK_WOOD} roughness={0.50} />
      </mesh>
      <mesh position={[cx + roomW * 0.32, 0.35, cz - roomD * 0.15]} castShadow>
        <boxGeometry args={[0.06, 0.65, 0.06]} />
        <meshStandardMaterial color={OAK_WOOD} roughness={0.50} />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════
          WINDOW WALLS — floor-to-ceiling glass on sides
          ═══════════════════════════════════════════════════════════ */}
      <WindowPanel
        position={[cx - roomW * 0.42, 0.45, cz + roomD * 0.05]}
        width={0.25}
        height={0.55}
        rotation={[0, Math.PI / 2, 0]}
      />
      <WindowPanel
        position={[cx + roomW * 0.42, 0.45, cz + roomD * 0.05]}
        width={0.25}
        height={0.55}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══════════════════════════════════════════════════════════
          CENTRAL FIREPLACE — floor-to-ceiling limestone monolith
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx, 0, cz]}>
        <FireplaceMonolith />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          AREA RUGS — left and right seating zones (symmetrical)
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx, 0, cz]}>
        {/* Left rug */}
        <AreaRug position={[-roomW * 0.18, 0.006, roomD * 0.12]} width={roomW * 0.32} depth={roomD * 0.40} />
        {/* Right rug */}
        <AreaRug position={[roomW * 0.18, 0.006, roomD * 0.12]} width={roomW * 0.32} depth={roomD * 0.40} />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          LEFT SEATING GROUP
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx - roomW * 0.18, 0, cz + roomD * 0.12]}>
        {/* Chaise Sofa — facing center/right */}
        <ChaiseSofa position={[0.12, 0, -roomD * 0.08]} rotation={[0, -Math.PI * 0.35, 0]} />
        {/* Wingback Chair — facing inward */}
        <WingbackChair position={[-0.08, 0, roomD * 0.08]} rotation={[0, Math.PI * 0.25, 0]} />
        {/* Coffee Table — center of group */}
        <CoffeeTable position={[0, 0.14, 0]} size={[roomW * 0.24, 0.14, roomD * 0.10]} />
        {/* Coffee table books */}
        <CoffeeTableBooks position={[0, 0.15, 0.01]} />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT SEATING GROUP
          ═══════════════════════════════════════════════════════════ */}
      <group position={[cx + roomW * 0.18, 0, cz + roomD * 0.12]}>
        {/* Chaise Sofa — facing center/left */}
        <ChaiseSofa position={[-0.12, 0, -roomD * 0.08]} rotation={[0, Math.PI * 0.35, 0]} />
        {/* Wingback Chair — facing inward */}
        <WingbackChair position={[0.08, 0, roomD * 0.08]} rotation={[0, -Math.PI * 0.25, 0]} />
        {/* Coffee Table — center of group */}
        <CoffeeTable position={[0, 0.14, 0]} size={[roomW * 0.24, 0.14, roomD * 0.10]} />
        {/* Coffee table books */}
        <CoffeeTableBooks position={[0, 0.15, -0.01]} />
      </group>

      {/* ═══════════════════════════════════════════════════════════
          OUTER SEATING — three-seater sofas against walls
          ═══════════════════════════════════════════════════════════ */}
      <ThreeSeaterSofa
        position={[cx - roomW * 0.35, 0, cz + roomD * 0.05]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <ThreeSeaterSofa
        position={[cx + roomW * 0.35, 0, cz + roomD * 0.05]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Neutral lounge chairs near back */}
      <LoungeChair
        position={[cx - roomW * 0.30, 0, cz - roomD * 0.08]}
        rotation={[0, Math.PI * 0.15, 0]}
      />
      <LoungeChair
        position={[cx + roomW * 0.30, 0, cz - roomD * 0.08]}
        rotation={[0, -Math.PI * 0.15, 0]}
      />

      {/* ═══════════════════════════════════════════════════════════
          FLOOR LAMPS — near seating groups
          ═══════════════════════════════════════════════════════════ */}
      <FloorLamp position={[cx - roomW * 0.28, 0, cz + roomD * 0.28]} />
      <FloorLamp position={[cx + roomW * 0.28, 0, cz + roomD * 0.28]} />

      {/* ═══════════════════════════════════════════════════════════
          WALL SCONCES — alabaster blocks on wood pillars
          ═══════════════════════════════════════════════════════════ */}
      <WallSconce
        position={[cx - roomW * 0.30, 0.45, cz - roomD * 0.15]}
        rotation={[0, 0, 0]}
      />
      <WallSconce
        position={[cx + roomW * 0.30, 0.45, cz - roomD * 0.15]}
        rotation={[0, 0, 0]}
      />

      {/* ═══════════════════════════════════════════════════════════
          SIDE TABLES — small, with florals
          ═══════════════════════════════════════════════════════════ */}
      <SideTable position={[cx - roomW * 0.15, 0, cz + roomD * 0.28]} />
      <SideTable position={[cx + roomW * 0.15, 0, cz + roomD * 0.28]} />
      <SideTable position={[cx - roomW * 0.15, 0, cz - roomD * 0.22]} />
      <SideTable position={[cx + roomW * 0.15, 0, cz - roomD * 0.22]} />

      {/* ═══════════════════════════════════════════════════════════
          AMBIENT WARM LIGHTING
          ═══════════════════════════════════════════════════════════ */}
      <pointLight position={[cx, 0.80, cz]} intensity={0.4} color="#f5ead5" distance={3.5} />
      <pointLight position={[cx, 0.25, cz - roomD * 0.35]} intensity={0.6} color={FLAME_ORANGE} distance={2.5} />

      {/* ═══════════════════════════════════════════════════════════
          ZONE LABEL — floor decal
          ═══════════════════════════════════════════════════════════ */}
      <Text
        position={[cx, 0.06, cz + roomD * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        color="#998877"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.005}
        outlineColor="#1a1814"
      >
        🛋️ LOUNGE
      </Text>
    </group>
  )
}
