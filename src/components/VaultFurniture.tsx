import React from 'react'

// ─── Vault Furniture — Bank-Style Reinforced Vault ──────────────────
// Heavy, solid, intimidating. Circular vault door with combination dial,
// reinforced walls, bolted corners, step platform.

interface VaultFurnitureProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

export default function VaultFurniture({ col, row, colSpan, rowSpan, gridCols, gridRows }: VaultFurnitureProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)

  const vaultW = colSpan * cellW * 0.52
  const vaultD = rowSpan * cellD * 0.50
  const vaultH = 0.75
  const doorRadius = vaultW * 0.32
  const wallThickness = 0.06

  return (
    <group>
      {/* ─── Raised concrete step/platform ─── */}
      <mesh position={[cx, 0.025, cz]} castShadow receiveShadow>
        <boxGeometry args={[vaultW + 0.16, 0.05, vaultD + 0.16]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[cx, 0.055, cz]} castShadow receiveShadow>
        <boxGeometry args={[vaultW + 0.08, 0.03, vaultD + 0.08]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.75} metalness={0.1} />
      </mesh>

      {/* ─── Vault body — heavy reinforced concrete + steel shell ─── */}
      {/* Main body */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz]} castShadow receiveShadow>
        <boxGeometry args={[vaultW, vaultH, vaultD]} />
        <meshStandardMaterial color="#3d3226" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Reinforced corners — steel plates */}
      {[
        [-vaultW / 2 + 0.02, -vaultD / 2 + 0.02],
        [vaultW / 2 - 0.02, -vaultD / 2 + 0.02],
        [-vaultW / 2 + 0.02, vaultD / 2 - 0.02],
        [vaultW / 2 - 0.02, vaultD / 2 - 0.02],
      ].map(([cx2, cz2], i) => (
        <mesh key={`corner-${i}`} position={[cx + cx2, vaultH / 2 + 0.07, cz + cz2]} castShadow>
          <boxGeometry args={[wallThickness, vaultH, wallThickness]} />
          <meshStandardMaterial color="#6b5b4f" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Horizontal steel bands (3 bands wrapping around the vault) */}
      {[vaultH * 0.25, vaultH * 0.5, vaultH * 0.75].map((bandY, i) => (
        <mesh key={`band-${i}`} position={[cx, bandY + 0.07, cz]} castShadow>
          <boxGeometry args={[vaultW + 0.015, 0.04, vaultD + 0.015]} />
          <meshStandardMaterial color="#5a4a3a" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* ─── Vault Door (circular, on front face +Z) ─── */}
      {/* Door frame / reinforced ring */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[doorRadius + 0.04, doorRadius + 0.04, 0.07, 48]} />
        <meshStandardMaterial color="#78716c" metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Main door — thick cylinder, slightly recessed */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[doorRadius, doorRadius, 0.08, 48]} />
        <meshStandardMaterial
          color="#b87333"
          metalness={0.9}
          roughness={0.12}
          emissive="#4a2a0a"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Inner door ring (recessed detail) */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[doorRadius * 0.75, 0.02, 16, 48]} />
        <meshStandardMaterial color="#8b6914" metalness={0.95} roughness={0.05} />
      </mesh>

      {/* ─── Combination Dial ─── */}
      <mesh position={[cx, vaultH / 2 + 0.03, cz + vaultD / 2 + 0.09]}>
        <cylinderGeometry args={[doorRadius * 0.22, doorRadius * 0.22, 0.04, 32]} />
        <meshStandardMaterial color="#78716c" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Dial knob */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.1]}>
        <cylinderGeometry args={[doorRadius * 0.12, doorRadius * 0.12, 0.05, 24]} />
        <meshStandardMaterial color="#57534e" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Dial markings (notches around the dial) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const rd = doorRadius * 0.2
        return (
          <mesh
            key={`dial-notch-${i}`}
            position={[cx + Math.cos(angle) * rd, vaultH / 2 + 0.05, cz + vaultD / 2 + 0.09]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.015, 0.01, 0.03]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
          </mesh>
        )
      })}

      {/* ─── Spoke wheel / handle ─── */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.1]} rotation={[0, 0, Math.PI / 8]}>
        <torusGeometry args={[doorRadius * 0.45, 0.025, 8, 32]} />
        <meshStandardMaterial color="#57534e" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* 5 spokes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = Math.PI / 8 + (i / 5) * Math.PI * 2
        const spokeLen = doorRadius * 0.4
        return (
          <mesh
            key={`spoke-${i}`}
            position={[
              cx + Math.cos(angle) * spokeLen * 0.5,
              vaultH / 2 + 0.07,
              cz + vaultD / 2 + 0.1,
            ]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[spokeLen, 0.015, 0.015]} />
            <meshStandardMaterial color="#78716c" metalness={0.95} roughness={0.05} />
          </mesh>
        )
      })}
      {/* Center hub */}
      <mesh position={[cx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.11]}>
        <cylinderGeometry args={[doorRadius * 0.1, doorRadius * 0.1, 0.04, 24]} />
        <meshStandardMaterial color="#44403c" metalness={0.95} roughness={0.05} />
      </mesh>

      {/* ─── Locking bolts (bottom, top, left, right of door) ─── */}
      {[
        [0, -(doorRadius + 0.06)],
        [0, doorRadius + 0.06],
        [-(doorRadius + 0.06), 0],
        [doorRadius + 0.06, 0],
      ].map(([bx, bz], i) => (
        <mesh
          key={`lock-bolt-${i}`}
          position={[cx + bx, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.02 + bz * 0.6]}
        >
          <boxGeometry args={[0.06, 0.06, 0.08]} />
          <meshStandardMaterial color="#b91c1c" metalness={0.9} roughness={0.1} emissive="#7f1d1d" emissiveIntensity={0.15} />
        </mesh>
      ))}

      {/* ─── Rivet details on door ─── */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const rd = doorRadius * 0.62
        return (
          <mesh
            key={`rivet-${i}`}
            position={[cx + Math.cos(angle) * rd, vaultH / 2 + 0.07, cz + vaultD / 2 + 0.08]}
          >
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#57534e" metalness={0.95} roughness={0.1} />
          </mesh>
        )
      })}

      {/* ─── Hinge side (left of door on front face) ─── */}
      {[0.3, 0.5, 0.7].map((hy, i) => (
        <mesh
          key={`hinge-${i}`}
          position={[cx - doorRadius - 0.05, vaultH * hy + 0.07, cz + vaultD / 2 + 0.03]}
        >
          <boxGeometry args={[0.08, 0.08, 0.05]} />
          <meshStandardMaterial color="#78716c" metalness={0.95} roughness={0.05} />
        </mesh>
      ))}

      {/* ─── Warning label / stripe on front face above door ─── */}
      <mesh
        position={[cx, vaultH * 0.88 + 0.07, cz + vaultD / 2 + 0.04]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry args={[vaultW * 0.5, 0.04, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.15} />
      </mesh>

      {/* ─── Floor bolts (anchor points to concrete) ─── */}
      {[
        [-vaultW * 0.35, -vaultD * 0.3],
        [vaultW * 0.35, -vaultD * 0.3],
        [-vaultW * 0.35, vaultD * 0.3],
        [vaultW * 0.35, vaultD * 0.3],
      ].map(([bx, bz], i) => (
        <mesh key={`fbolt-${i}`} position={[cx + bx, 0.1, cz + bz]}>
          <cylinderGeometry args={[0.05, 0.07, 0.06, 8]} />
          <meshStandardMaterial color="#57534e" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* ─── Top warning beacon / light ─── */}
      <mesh position={[cx, vaultH + 0.14, cz + vaultD / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.06]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[cx, vaultH + 0.09, cz + vaultD / 2 + 0.02]}>
        <cylinderGeometry args={[0.02, 0.02, 0.06, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ─── "VAULT" label etched on door ─── */}
      <mesh position={[cx, vaultH * 0.5 + 0.07, cz + vaultD / 2 + 0.08]}>
        <planeGeometry args={[doorRadius * 0.5, 0.07]} />
        <meshStandardMaterial color="#8b6914" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}
