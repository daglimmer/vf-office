import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Data Centre Command Center — v4.0.2-CC ────────────────────────────
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
        <meshBasicMaterial color="#00ddff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan edge ring — mid tier */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.77, radius * 0.80, 64]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan edge ring — inner tier */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.54, radius * 0.57, 64]} />
        <meshBasicMaterial color="#00ddff" transparent opacity={0.9} side={THREE.DoubleSide} />
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
        <meshBasicMaterial color="#00ddff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Bottom cap ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[towerRadius - 0.04, towerRadius + 0.01, 48]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Tower light source */}
      <pointLight position={[0, towerHeight / 2, 0]} intensity={1.2} color="#00ddff" distance={5} />
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
        <meshBasicMaterial color="#00ddff" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Cyan neon mid ring */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.71, radius * 0.73, 64]} />
        <meshBasicMaterial color="#00ccff" transparent opacity={0.7} side={THREE.DoubleSide} />
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

// ─── Glass Wall Panel — translucent divider between DC and Oly's Office ──
function GlassWallPanel({ position, width, height, color }: {
  position: [number, number, number]
  width: number
  height: number
  color: string
}) {
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = 0.25 + Math.sin(clock.elapsedTime * 0.5) * 0.08
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = pulse
    }
  })

  return (
    <group position={position}>
      {/* Main glass pane — translucent teal/smoke */}
      <mesh>
        <boxGeometry args={[0.04, height * 0.92, width * 0.88]} />
        <meshPhysicalMaterial
          color="#1a2a3a"
          metalness={0.08}
          roughness={0.06}
          transparent
          opacity={0.32}
          envMapIntensity={0.4}
          clearcoat={0.12}
          clearcoatRoughness={0.18}
          emissive={color}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Glass edge frames — top and bottom rails */}
      <mesh position={[0, height * 0.46, 0]}>
        <boxGeometry args={[0.06, 0.02, width * 0.90]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -height * 0.46, 0]}>
        <boxGeometry args={[0.06, 0.02, width * 0.90]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical structural mullions */}
      {[width * 0.3, 0, -width * 0.3].map((zm, mi) => (
        <mesh key={`mullion-${mi}`} position={[0, 0, zm]}>
          <boxGeometry args={[0.025, height * 0.88, 0.02]} />
          <meshStandardMaterial color="#1e2e3e" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}

      {/* Subtle cyan edge glow */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.045, height * 0.93, width * 0.89]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.05}
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  )
}

// ─── Glass-Mounted Screen — display panel physically attached to glass wall ──
function GlassMountedScreen({ position, size, glassX }: {
  position: [number, number, number]
  size: [number, number]
  glassX: number
}) {
  const ledRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (ledRef.current) {
      const pulse = 0.6 + Math.sin(clock.elapsedTime * 1.5) * 0.2
      const mat = ledRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = pulse
    }
  })

  // Screen faces the DC interior (toward -X / center)
  // Positioned on the DC side of the glass, flush-mounted
  const scrX = glassX - 0.025  // slightly inside from glass surface

  return (
    <group position={[scrX, position[1], position[2]]}>
      {/* Mounting bracket — top clamp onto glass rail */}
      <mesh position={[0.025, size[1] / 2 + 0.015, 0]}>
        <boxGeometry args={[0.05, 0.02, size[0] * 0.6]} />
        <meshStandardMaterial color="#1a1d26" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Mounting bracket — bottom clamp */}
      <mesh position={[0.025, -size[1] / 2 - 0.015, 0]}>
        <boxGeometry args={[0.05, 0.02, size[0] * 0.6]} />
        <meshStandardMaterial color="#1a1d26" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* VESA arm — connects screen to glass mount point */}
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.025, 0.03, 0.03]} />
        <meshStandardMaterial color="#22262e" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Screen bezel/frame — dark metal */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.015, size[1], size[0]]} />
        <meshStandardMaterial color="#0a0f18" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Screen display surface — facing DC interior (-X direction) */}
      <mesh position={[-0.005, 0, 0]}>
        <planeGeometry args={[size[0] - 0.04, size[1] - 0.04]} />
        <meshStandardMaterial
          color="#0a1a30"
          emissive="#0d2040"
          emissiveIntensity={0.5}
          roughness={0.04}
        />
      </mesh>

      {/* UI elements on screen */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`gbar-${i}`} position={[
          -0.006,
          size[1] * 0.28 - i * size[1] * 0.15,
          (i - 1.5) * 0.08
        ]}>
          <boxGeometry args={[0.001, 0.003 + i * 0.004, 0.04]} />
          <meshBasicMaterial color={i < 2 ? '#22dd88' : '#44aadd'} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Circular widget on screen */}
      <mesh position={[-0.006, -size[1] * 0.28, 0]}>
        <ringGeometry args={[0.025, 0.030, 24, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#44ccff" transparent opacity={0.5} />
      </mesh>

      {/* Status LED on bezel edge */}
      <mesh ref={ledRef} position={[0.008, size[1] / 2 - 0.03, size[0] / 2 - 0.025]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// ─── Wall Screen Bank — large display panels on perimeter walls ─────
function WallScreenBank({ position, rotation, size, variant }: {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
  variant?: 'big' | 'medium' | 'alerts'
}) {
  const accentColor = variant === 'alerts' ? '#ff6644' : variant === 'big' ? '#00ddff' : '#44ff88'

  return (
    <group position={position} rotation={rotation}>
      {/* Main frame — thicker for large screens */}
      <mesh castShadow>
        <boxGeometry args={[size[0], size[1], 0.020]} />
        <meshStandardMaterial color="#080c14" metalness={0.7} roughness={0.15} />
      </mesh>

      {/* Screen surface — bright */}
      <mesh position={[0, 0, 0.010]}>
        <planeGeometry args={[size[0] - 0.05, size[1] - 0.05]} />
        <meshStandardMaterial
          color="#081422"
          emissive="#102840"
          emissiveIntensity={0.7}
          roughness={0.03}
        />
      </mesh>

      {/* Dashboard title bar */}
      <mesh position={[0, size[1] * 0.45, 0.012]}>
        <planeGeometry args={[size[0] * 0.88, 0.025]} />
        <meshBasicMaterial color={variant === 'alerts' ? '#442222' : '#1a3344'} transparent opacity={0.7} />
      </mesh>

      {/* Chart area — bar graphs */}
      {variant !== 'alerts' && Array.from({ length: 8 }).map((_, i) => {
        const bh = 0.01 + Math.random() * size[1] * 0.25
        return (
          <mesh key={`ws-bar-${i}`} position={[
            -size[0] * 0.30 + i * size[0] * 0.08,
            -size[1] * 0.10 + bh / 2,
            0.012,
          ]}>
            <boxGeometry args={[size[0] * 0.035, bh, 0.001]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.7} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}

      {/* Status indicators — data rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`ws-row-${i}`} position={[
          -size[0] * 0.30,
          size[1] * 0.30 - i * size[1] * 0.12,
          0.012,
        ]}>
          <boxGeometry args={[0.03 + Math.random() * size[0] * 0.40, 0.005, 0.001]} />
          <meshBasicMaterial color={
            variant === 'alerts' ? '#ff6644' :
            i < 2 ? '#22ff88' : i < 4 ? '#44ccff' : '#ffaa44'
          } transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Alert banners (for alerts variant) */}
      {variant === 'alerts' && Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`ws-alert-${i}`} position={[0, size[1] * 0.25 - i * size[1] * 0.15, 0.013]}>
          <boxGeometry args={[size[0] * 0.45, 0.008, 0.001]} />
          <meshBasicMaterial color={i === 0 ? '#ff3322' : i === 1 ? '#ff6622' : '#ffaa44'} 
            transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Data dots */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`ws-dot-${i}`} position={[
          size[0] * 0.30 + (Math.random() - 0.5) * size[0] * 0.20,
          (Math.random() - 0.5) * size[1] * 0.60,
          0.012,
        ]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Large gauge ring (for big variant) */}
      {variant === 'big' && (
        <mesh position={[size[0] * 0.30, -size[1] * 0.15, 0.012]}>
          <ringGeometry args={[0.04, 0.055, 32, 1, 0, Math.PI * 1.5]} />
          <meshBasicMaterial color="#00ddff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Thin cyan frame glow */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[size[0] - 0.01, size[1] - 0.01, 0.004]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.10} />
      </mesh>

      {/* Screen backlight */}
      <pointLight position={[0, 0, -0.1]} intensity={0.2} color={accentColor} distance={1.5} />
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
      {/* RAISED MONITOR — sits on top of console (FIX 1) */}
      <group position={[0, 0.52, -0.08]}>
        {/* Monitor stand — cylinder */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.015, 0.020, 0.04, 8]} />
          <meshStandardMaterial color="#2a2d35" metalness={0.70} roughness={0.20} />
        </mesh>
        {/* Monitor stand base */}
        <mesh position={[0, -0.10, 0]}>
          <cylinderGeometry args={[0.025, 0.030, 0.008, 8]} />
          <meshStandardMaterial color="#3a3d45" metalness={0.60} roughness={0.25} />
        </mesh>
        {/* Monitor bezel */}
        <mesh>
          <boxGeometry args={[0.18, 0.10, 0.008]} />
          <meshStandardMaterial color="#0a0c10" metalness={0.40} roughness={0.18} />
        </mesh>
        {/* Screen surface */}
        <mesh position={[0, 0, 0.006]}>
          <boxGeometry args={[0.16, 0.08, 0.003]} />
          <meshStandardMaterial color="#0a1a30" emissive="#0d2040" emissiveIntensity={0.5} roughness={0.04} />
        </mesh>
        {/* Screen content glow */}
        <mesh position={[0, 0, 0.009]}>
          <planeGeometry args={[0.14, 0.06]} />
          <meshBasicMaterial color="#00ddff" transparent opacity={0.20} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Data bars on screen */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={`cmon-bar-${i}`} position={[-0.05 + i * 0.03, 0.01, 0.010]}>
            <boxGeometry args={[0.015, 0.003 + i * 0.004, 0.001]} />
            <meshBasicMaterial color={i < 2 ? '#22ff88' : '#44aaff'} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      {/* Console edge glow */}
      <mesh position={[0, 0.34, -0.05]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.40, 0.018, 0.22]} />
        <meshBasicMaterial color="#00ddff" transparent opacity={0.12} />
      </mesh>
      {/* Indicator lights */}
      {[-0.15, 0, 0.15].map((ox, li) => (
        <mesh key={`ind-${li}`} position={[ox, 0.34, 0.05]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <meshBasicMaterial color={li === 0 ? '#44ff88' : li === 1 ? '#ffaa44' : '#00ddff'} transparent opacity={0.9} />
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
      <CeilingRings position={[0, 3.2, 0]} radius={roomRadius * 0.90} />

      {/* ─── GLASS WALL — Shared boundary with Oly's Office (right side) ─── */}
      <GlassWallPanel
        position={[zW * 0.48, 0, 0]}
        width={zD * 0.85}
        height={3.4}
        color="#00ff88"
      />

      {/* ─── Screens mounted ON the glass wall (Oly's Office side) ─── */}
      {/* Upper display — cluster status */}
      <GlassMountedScreen
        position={[0, 1.05, -zD * 0.15]}
        size={[0.36, 0.28]}
        glassX={zW * 0.48}
      />

      {/* Lower display — metrics dashboard */}
      <GlassMountedScreen
        position={[0, 0.50, zD * 0.18]}
        size={[0.32, 0.24]}
        glassX={zW * 0.48}
      />

      {/* ─── Perimeter Wall Screen Banks — back and left walls ─── */}
      {/* Back wall — center map display */}
      <WallScreenBank
        position={[0, 1.40, -zD * 0.36]}
        rotation={[0, 0, 0]}
        size={[0.75, 0.55]}
      />

      {/* Back-left wall */}
      <WallScreenBank
        position={[-zW * 0.32, 1.25, -zD * 0.34]}
        rotation={[0, Math.PI / 12, 0]}
        size={[0.50, 0.42]}
      />

      {/* Back-right wall */}
      <WallScreenBank
        position={[zW * 0.32, 1.25, -zD * 0.34]}
        rotation={[0, -Math.PI / 12, 0]}
        size={[0.50, 0.42]}
      />

      {/* Left wall screen */}
      <WallScreenBank
        position={[-zW * 0.36, 1.10, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[0.45, 0.40]}
      />

      {/* ─── Perimeter Console Stations ─── */}
      <ConsoleStation position={[0, 0, -zD * 0.32]} rotation={[0, 0, 0]} />
      <ConsoleStation position={[-zW * 0.30, 0, -zD * 0.20]} rotation={[0, Math.PI / 4, 0]} />
      <ConsoleStation position={[zW * 0.30, 0, -zD * 0.20]} rotation={[0, -Math.PI / 4, 0]} />

      {/* ─── TRAEFIK PROXY — floating label above tower ─── */}
      <group position={[0, 3.3, 0.05]}>
        <Text
          fontSize={0.18}
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
          <meshBasicMaterial color="#00ccff" transparent opacity={0.7} />
        </mesh>
        <pointLight position={[0, 0, 0.2]} intensity={0.6} color="#00ccff" distance={2.5} />
      </group>

      {/* ─── NEON SIGNS — vibrant wall accents (FIX 3) ─── */}
      {/* Cloud neon sign — "110lymph.nl" (cyan) */}
      <group position={[-zW * 0.20, 2.2, -zD * 0.35]}>
        <mesh position={[0, 0, 0.005]}>
          <boxGeometry args={[0.50, 0.20, 0.015]} />
          <meshStandardMaterial color="#15171c" metalness={0.55} roughness={0.35} />
        </mesh>
        <Text position={[0, 0, 0.025]} fontSize={0.08} color={'#ffffff'}
          anchorX="center" anchorY="middle" font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.003} outlineColor="#0a2a3a">
          110lymph.nl
        </Text>
        <mesh position={[0, 0.06, 0.02]}>
          <boxGeometry args={[0.30, 0.008, 0.008]} />
          <meshBasicMaterial color="#00ddff" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, -0.06, 0.02]}>
          <boxGeometry args={[0.25, 0.006, 0.006]} />
          <meshBasicMaterial color="#00ddff" transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight position={[0, 0, 0.1]} intensity={0.6} color="#00ddff" distance={2.0} />
      </group>

      {/* Shield neon sign — orange circuit traces */}
      <group position={[zW * 0.25, 2.0, -zD * 0.35]}>
        <mesh position={[0, 0, 0.005]}>
          <boxGeometry args={[0.30, 0.35, 0.015]} />
          <meshStandardMaterial color="#15171c" metalness={0.55} roughness={0.35} />
        </mesh>
        {/* Shield outline */}
        {[
          { x: -0.06, y: 0.05, w: 0.010, h: 0.20 },
          { x: 0.06, y: 0.05, w: 0.010, h: 0.20 },
          { x: 0, y: -0.05, w: 0.010, h: 0.10 },
          { x: 0, y: 0.16, w: 0.10, h: 0.010 },
          { x: 0, y: -0.10, w: 0.12, h: 0.010 },
        ].map((seg, i) => (
          <mesh key={`shield-seg-${i}`} position={[seg.x, seg.y, 0.02]}>
            <boxGeometry args={[seg.w, seg.h, 0.012]} />
            <meshBasicMaterial color="#ff7722" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        {/* Circuit traces */}
        {[
          { x: -0.02, y: 0.02, w: 0.06, h: 0.005 },
          { x: -0.05, y: -0.04, w: 0.04, h: 0.005 },
          { x: 0.02, y: -0.06, w: 0.05, h: 0.005 },
        ].map((t, i) => (
          <mesh key={`shield-trace-${i}`} position={[t.x, t.y, 0.025]}>
            <boxGeometry args={[t.w, t.h, 0.006]} />
            <meshBasicMaterial color="#ffaa44" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        <pointLight position={[0, 0, 0.1]} intensity={0.5} color="#ff7722" distance={1.8} />
      </group>

      {/* ─── Ambient point lights — cool blue command center glow ─── */}
      <pointLight position={[0, 1.5, 0]} intensity={0.8} color="#003366" distance={5} />
      <pointLight position={[-zW * 0.25, 1.2, -zD * 0.25]} intensity={0.5} color="#0066aa" distance={3.5} />
      <pointLight position={[zW * 0.25, 1.2, -zD * 0.25]} intensity={0.5} color="#0066aa" distance={3.5} />

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
