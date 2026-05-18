import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Data Centre — Image 5 Style: Hexagonal Portal ──────────────────
// Large hexagonal ring structure, "Traefik Proxy" label,
// digital holographic displays with technical readouts,
// blue energy streams, dark reflective floor

interface DataCenterProps {
  col: number; row: number; colSpan: number; rowSpan: number
  gridCols: number; gridRows: number
}

// ─── Hexagonal Portal Ring ──────────────────────────────────────────
function HexagonalPortal({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)
  const innerGlowRef = useRef<THREE.Mesh>(null!)
  const vortexRef = useRef<THREE.Group>(null!)

  const portalRadius = 0.65
  const segmentThickness = 0.05

  // Compute hexagonal vertices
  const vertices = useMemo(() => {
    const verts: [number, number][] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6 // offset so flat sides are top/bottom
      verts.push([Math.cos(angle) * portalRadius, Math.sin(angle) * portalRadius])
    }
    return verts
  }, [portalRadius])

  // Compute segments (edges between adjacent vertices)
  const segments = useMemo(() => {
    const segs: { pos: [number, number, number]; rot: [number, number, number]; len: number }[] = []
    for (let i = 0; i < 6; i++) {
      const v1 = vertices[i]
      const v2 = vertices[(i + 1) % 6]
      const midX = (v1[0] + v2[0]) / 2
      const midY = (v1[1] + v2[1]) / 2
      const dx = v2[0] - v1[0]
      const dy = v2[1] - v1[1]
      const len = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      segs.push({
        pos: [midX, midY, 0],
        rot: [0, 0, angle],
        len,
      })
    }
    return segs
  }, [vertices])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.001
    }
    if (innerGlowRef.current) {
      const pulse = 0.7 + Math.sin(t * 1.2) * 0.3
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + pulse * 0.1
    }
    if (vortexRef.current) {
      vortexRef.current.rotation.z += 0.008
    }
  })

  // Vortex particle positions
  const vortexParticles = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.1 + Math.random() * portalRadius * 0.8
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = Math.sin(angle) * radius
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08
    }
    return pos
  }, [portalRadius])

  return (
    <group ref={groupRef} position={position}>
      {/* ─── Hexagonal frame segments — thick dark metal ─── */}
      {segments.map((seg, i) => (
        <group key={`hseg-${i}`} position={seg.pos} rotation={seg.rot}>
          {/* Outer frame */}
          <mesh>
            <boxGeometry args={[seg.len, segmentThickness * 1.4, segmentThickness * 1.4]} />
            <meshStandardMaterial color="#1a1d26" metalness={0.65} roughness={0.3} />
          </mesh>
          {/* Inner emissive edge — blue neon */}
          <mesh position={[0, -segmentThickness * 0.2, 0]}>
            <boxGeometry args={[seg.len * 0.94, segmentThickness * 0.5, segmentThickness * 0.6]} />
            <meshStandardMaterial
              color="#2288cc"
              emissive="#2288cc"
              emissiveIntensity={1.2}
              roughness={0.05}
            />
          </mesh>
          {/* Outer emissive edge */}
          <mesh position={[0, segmentThickness * 0.5, 0]}>
            <boxGeometry args={[seg.len * 0.9, segmentThickness * 0.25, segmentThickness * 0.3]} />
            <meshStandardMaterial
              color="#66aadd"
              emissive="#4499cc"
              emissiveIntensity={0.6}
              roughness={0.05}
            />
          </mesh>
        </group>
      ))}

      {/* ─── Corner accent nodes at vertices ─── */}
      {vertices.map((v, i) => (
        <mesh key={`vnode-${i}`} position={[v[0], v[1], 0]}>
          <sphereGeometry args={[segmentThickness * 0.9, 8, 8]} />
          <meshStandardMaterial
            color="#3399dd"
            emissive="#3399dd"
            emissiveIntensity={1.5}
            roughness={0.05}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* ─── Inner glow plane — subtle blue emission inside portal ─── */}
      <mesh ref={innerGlowRef}>
        <circleGeometry args={[portalRadius * 0.8, 32]} />
        <meshBasicMaterial
          color="#3388cc"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Vortex particle system — swirling energy ─── */}
      <group ref={vortexRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={vortexParticles.length / 3}
              array={vortexParticles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#88ccff"
            size={0.018}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Vortex ring layers */}
        {[0.25, 0.38, 0.50].map((r, i) => (
          <mesh key={`vr-${i}`}>
            <ringGeometry args={[r, r + 0.015, 48]} />
            <meshBasicMaterial
              color="#5599cc"
              transparent
              opacity={0.3 - i * 0.08}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Light source — point light emanating from portal */}
      <pointLight position={[0, 0, 0.5]} intensity={1.0} color="#3399dd" distance={3.5} />
      <pointLight position={[0, 0, -0.5]} intensity={0.5} color="#3377bb" distance={2.5} />
    </group>
  )
}

// ─── Digital Holographic Display Panel ──────────────────────────────
function HolographicDisplay({ position, rotation, width, height }: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
}) {
  const animRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }) => {
    if (animRef.current) {
      animRef.current.position.y += Math.sin(clock.elapsedTime * 0.5) * 0.0002
    }
  })

  return (
    <group ref={animRef} position={position} rotation={rotation}>
      {/* Display frame — semi-transparent holographic surface */}
      <mesh>
        <boxGeometry args={[width, height, 0.008]} />
        <meshPhysicalMaterial
          color="#112233"
          metalness={0.05}
          roughness={0.04}
          emissive="#112244"
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* Content — data visualization elements */}
      {/* Wireframe sphere */}
      <mesh position={[width * 0.20, height * 0.15, 0.006]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshBasicMaterial color="#3388cc" wireframe transparent opacity={0.55} />
      </mesh>
      {/* Ring around sphere */}
      <mesh position={[width * 0.20, height * 0.15, 0.007]}>
        <ringGeometry args={[0.05, 0.055, 32]} />
        <meshBasicMaterial color="#5599cc" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Bar charts */}
      {[0.06, 0.09, 0.05, 0.11, 0.07].map((h, i) => (
        <mesh key={`bar-${i}`} position={[-width * 0.15 + i * 0.05, -height * 0.1 + h / 2, 0.006]}>
          <boxGeometry args={[0.025, h, 0.002]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#44aadd' : '#3377bb'} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Text lines — data readouts */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`dline-${i}`} position={[-width * 0.25, height * 0.2 - i * 0.06, 0.006]}>
          <boxGeometry args={[0.04 + i * 0.03, 0.003, 0.001]} />
          <meshBasicMaterial color="#5599cc" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Circular progress indicators */}
      {[0, 1, 2].map((_, i) => (
        <mesh key={`prog-${i}`} position={[width * 0.20, -height * 0.05 - i * 0.08, 0.006]}>
          <ringGeometry args={[0.018, 0.022, 24, 1, 0, Math.PI * (1.7 - i * 0.3)]} />
          <meshBasicMaterial color={i === 0 ? '#44ff88' : '#3388cc'} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Thin border glow */}
      <mesh>
        <boxGeometry args={[width + 0.01, height + 0.01, 0.003]} />
        <meshBasicMaterial color="#3388cc" transparent opacity={0.12} />
      </mesh>

      {/* Bottom status bar */}
      <mesh position={[0, -height / 2 + 0.015, 0.006]}>
        <boxGeometry args={[width * 0.85, 0.006, 0.001]} />
        <meshBasicMaterial color="#3388cc" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

// ─── Energy Stream — horizontal data flow trails ────────────────────
function EnergyStreams({ position, width }: {
  position: [number, number, number]
  width: number
}) {
  const groupRef = useRef<THREE.Group>(null!)

  const streams = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      y: 0.3 + i * 0.18,
      offset: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.35,
      length: 0.2 + Math.random() * 0.6,
      alpha: 0.08 + Math.random() * 0.12,
    })),
    []
  )

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const s = streams[i]
      const phase = (t * s.speed + s.offset) % (Math.PI * 2)
      child.position.x = Math.sin(phase) * width * 0.35
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = s.alpha * (0.4 + 0.6 * Math.abs(Math.sin(phase)))
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {streams.map((s, i) => (
        <mesh key={`es-${i}`} position={[0, s.y, 0]}>
          <boxGeometry args={[s.length, 0.004, 0.003]} />
          <meshBasicMaterial
            color="#88ccff"
            transparent
            opacity={s.alpha}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Bridge Structure — white accent sweeping frame ─────────────────
function BridgeStructure({ position, width }: {
  position: [number, number, number]
  width: number
}) {
  return (
    <group position={position}>
      {/* Main horizontal bridge */}
      <mesh>
        <boxGeometry args={[width, 0.10, 0.08]} />
        <meshStandardMaterial
          color="#dce4ea"
          metalness={0.12}
          roughness={0.18}
          emissive="#334455"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Top accent line */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width * 0.95, 0.006, 0.09]} />
        <meshStandardMaterial
          color="#ebf0f5"
          emissive="#c8ddf0"
          emissiveIntensity={0.2}
          roughness={0.05}
        />
      </mesh>
      {/* Bottom accent line */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[width * 0.9, 0.005, 0.07]} />
        <meshStandardMaterial color="#c8d0d8" metalness={0.1} roughness={0.25} />
      </mesh>
    </group>
  )
}


// ─── MAIN: Data Centre Component ────────────────────────────────────
export default function DataCenter({ col, row, colSpan, rowSpan, gridCols, gridRows }: DataCenterProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows

  const cx = col * cellW + (colSpan * cellW) / 2 - floorWidth / 2
  const cz = -(row * cellD + (rowSpan * cellD) / 2 - floorDepth / 2)
  const zW = colSpan * cellW
  const zD = rowSpan * cellD

  return (
    <group>
      {/* ─── Highly reflective floor — dark polished obsidian ─── */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zW * 0.82, zD * 0.7]} />
        <meshStandardMaterial color="#060d18" roughness={0.08} metalness={0.9} transparent opacity={0.75} />
      </mesh>

      {/* ─── Floor circuitry — purple/magenta lines ─── */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={`fcl-${i}`}
          position={[cx, 0.006, cz + (i - 1) * 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[zW * 0.5, 0.008]} />
          <meshBasicMaterial color="#8833aa" transparent opacity={0.06} />
        </mesh>
      ))}
      {/* Cross lines */}
      {Array.from({ length: 2 }).map((_, i) => (
        <mesh
          key={`fcc-${i}`}
          position={[cx + (i - 0.5) * 0.6, 0.006, cz]}
          rotation={[-Math.PI / 2, Math.PI / 2, 0]}
        >
          <planeGeometry args={[zD * 0.5, 0.008]} />
          <meshBasicMaterial color="#8833aa" transparent opacity={0.05} />
        </mesh>
      ))}

      {/* ─── Background pillars — dark vertical columns ─── */}
      {[-1, 1].map((s) => (
        <mesh key={`pillar-${s}`} position={[cx + s * zW * 0.38, 0.25, cz - zD * 0.32]} castShadow>
          <boxGeometry args={[0.06, 0.5, 0.06]} />
          <meshStandardMaterial color="#080c16" metalness={0.3} roughness={0.55} />
        </mesh>
      ))}

      {/* ─── Bridge Structure — sweeping white frame ─── */}
      <BridgeStructure
        position={[cx, 1.15, cz]}
        width={zW * 0.75}
      />

      {/* ─── Hexagonal Portal — central focus ─── */}
      <HexagonalPortal position={[cx, 1.15, cz]} />

      {/* ─── "TRAEFIK PROXY" Label — floating text ─── */}
      <group position={[cx, 1.75, cz + 0.05]}>
        <Text
          position={[0, 0, 0.45]}
          fontSize={0.20}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.ttf"
          outlineWidth={0.008}
          outlineColor="#0a2a4a"
        >
          TRAEFIK PROXY
        </Text>
        {/* Text glow spill */}
        <pointLight position={[0, 0, 0.5]} intensity={0.6} color="#88ccff" distance={2.5} />
      </group>

      {/* ─── Energy Streams — horizontal data flows ─── */}
      <EnergyStreams position={[cx, 0, cz + 0.2]} width={zW * 0.5} />

      {/* ─── Holographic Display — left side ─── */}
      <HolographicDisplay
        position={[cx - zW * 0.35, 1.0, cz + 0.25]}
        rotation={[0, Math.PI / 6, 0]}
        width={0.25}
        height={0.32}
      />

      {/* ─── Holographic Display — right side ─── */}
      <HolographicDisplay
        position={[cx + zW * 0.35, 1.0, cz + 0.25]}
        rotation={[0, -Math.PI / 6, 0]}
        width={0.25}
        height={0.32}
      />

      {/* ─── Ceiling recessed lights ─── */}
      {[-0.6, 0, 0.6].map((ox, i) => (
        <mesh key={`clight-${i}`} position={[cx + ox, 0.94, cz]}>
          <boxGeometry args={[0.3, 0.012, 0.08]} />
          <meshStandardMaterial color="#e8edf0" emissive="#dde4ea" emissiveIntensity={0.25} roughness={0.05} />
        </mesh>
      ))}

      {/* ─── Foreground console pedestals ─── */}
      {[-1, 1].map((s) => (
        <mesh key={`console-${s}`} position={[cx + s * 0.4, 0.15, cz - 0.9]} castShadow>
          <boxGeometry args={[0.15, 0.25, 0.12]} />
          <meshStandardMaterial color="#0d111a" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      {/* Console top glows */}
      {[-1, 1].map((s) => (
        <mesh key={`ctop-${s}`} position={[cx + s * 0.4, 0.28, cz - 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 0.09]} />
          <meshBasicMaterial color="#3399dd" transparent opacity={0.1} />
        </mesh>
      ))}

      {/* ─── Zone label on floor ─── */}
      <Text
        position={[cx + zW * 0.05, 0.06, cz + zD * 0.40]}
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
