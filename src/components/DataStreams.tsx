import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Data Streams — Cyberpunk Neon Data Flow ───────────────────────
// Animated glowing particle streams between infrastructure zones
// Blue/cyan data: network traffic, purple/magenta: processing, green: storage

interface DataStreamsProps {
  gridCols: number
  gridRows: number
}

// ─── Particle Stream between two points ────────────────────────────
function ParticleBeam({
  start,
  end,
  color,
  count = 80,
  speed = 3.0,
  thickness = 0.02,
}: {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  count?: number
  speed?: number
  thickness?: number
}) {
  const pointsRef = useRef<THREE.Points>(null!)
  const offsetsRef = useRef<Float32Array>()

  const { positions, curve } = useMemo(() => {
    const sx = start[0], sy = start[1], sz = start[2]
    const ex = end[0], ey = end[1], ez = end[2]
    // Create a bezier curve with a slight arc
    const midX = (sx + ex) / 2
    const midY = Math.max(sy, ey) + 0.8
    const midZ = (sz + ez) / 2
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sx, sy, sz),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(ex, ey, ez)
    )
    const positions = new Float32Array(count * 3)
    return { positions, curve }
  }, [start, end, count])

  useMemo(() => {
    offsetsRef.current = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      offsetsRef.current[i] = Math.random()
    }
  }, [count])

  useFrame((_, delta) => {
    if (!pointsRef.current || !offsetsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      offsetsRef.current[i] += delta * speed * (0.5 + Math.random() * 0.5)
      if (offsetsRef.current[i] > 1) offsetsRef.current[i] -= 1
      const t = offsetsRef.current[i]
      const pt = curve.getPointAt(t)
      arr[i * 3] = pt.x
      arr[i * 3 + 1] = pt.y
      arr[i * 3 + 2] = pt.z
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={thickness}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={0.8}
      />
    </points>
  )
}

// ─── Neon Beam — thicker, glowing tube between points ──────────────
function NeonBeam({
  start,
  end,
  color,
  thickness = 0.015,
  opacity = 0.35,
}: {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  thickness?: number
  opacity?: number
}) {
  const curve = useMemo(() => {
    const midX = (start[0] + end[0]) / 2
    const midY = Math.max(start[1], end[1]) + 0.5
    const midZ = (start[2] + end[2]) / 2
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(...end)
    )
  }, [start, end])

  return (
    <mesh>
      <tubeGeometry args={[curve, 24, thickness, 6, false]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Hexagonal Gateway Node — network junction points ──────────────
function GatewayNode({
  position,
  color,
  size = 0.15,
}: {
  position: [number, number, number]
  color: string
  size?: number
}) {
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5
      ringRef.current.rotation.x += delta * 0.15
    }
  })

  return (
    <group position={position}>
      {/* Hexagonal ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[size, 0.012, 6, 6]} />
        <meshBasicMaterial
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Inner glow dot */}
      <mesh>
        <sphereGeometry args={[size * 0.25, 8, 8]} />
        <meshBasicMaterial
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

export default function DataStreams({ gridCols, gridRows }: DataStreamsProps) {
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows
  const fw = floorWidth

  const colX = (c: number) => c * cellW - fw / 2 + cellW / 2
  const rowZ = (r: number) => -(r * cellD - floorDepth / 2 + cellD / 2)

  return (
    <group>
      {/* ─── Data Streams: Server Room → Patch Room → Vault ─── */}
      <ParticleBeam
        start={[colX(1), 0.5, rowZ(1.5)]}
        end={[colX(3), 0.5, rowZ(1)]}
        color="#ff4488"
        count={60}
        speed={4.0}
        thickness={0.025}
      />
      <NeonBeam
        start={[colX(1), 0.3, rowZ(1.5)]}
        end={[colX(3), 0.3, rowZ(1)]}
        color="#ff0044"
        thickness={0.01}
        opacity={0.25}
      />

      <ParticleBeam
        start={[colX(3.5), 0.5, rowZ(1)]}
        end={[colX(6), 0.5, rowZ(1)]}
        color="#ff9944"
        count={50}
        speed={3.5}
        thickness={0.025}
      />
      <NeonBeam
        start={[colX(3.5), 0.3, rowZ(1)]}
        end={[colX(6), 0.3, rowZ(1)]}
        color="#ff6600"
        thickness={0.01}
        opacity={0.25}
      />

      {/* ─── Main Pipeline: Vault → Corridor → Data Centre ─── */}
      <ParticleBeam
        start={[colX(6), 0.6, rowZ(1)]}
        end={[colX(6), 0.6, rowZ(4.5)]}
        color="#44ff88"
        count={70}
        speed={3.0}
        thickness={0.03}
      />
      <ParticleBeam
        start={[colX(6), 0.4, rowZ(4.5)]}
        end={[colX(1), 0.4, rowZ(5.5)]}
        color="#00ff88"
        count={80}
        speed={4.5}
        thickness={0.028}
      />
      <NeonBeam
        start={[colX(6), 0.2, rowZ(1)]}
        end={[colX(6), 0.2, rowZ(4.8)]}
        color="#00ff44"
        thickness={0.012}
        opacity={0.3}
      />

      {/* ─── Processing Stream: Data Centre → Oly's Office ─── */}
      <ParticleBeam
        start={[colX(1), 0.5, rowZ(6)]}
        end={[colX(3), 0.5, rowZ(6)]}
        color="#00ccff"
        count={55}
        speed={2.5}
        thickness={0.022}
      />
      <NeonBeam
        start={[colX(1), 0.3, rowZ(6)]}
        end={[colX(3), 0.3, rowZ(6)]}
        color="#00ccff"
        thickness={0.01}
        opacity={0.25}
      />

      {/* ─── Secondary: Oly's Office → Meeting Room ─── */}
      <ParticleBeam
        start={[colX(3.5), 0.5, rowZ(6)]}
        end={[colX(5.5), 0.5, rowZ(6)]}
        color="#4488ff"
        count={45}
        speed={2.0}
        thickness={0.02}
      />
      <NeonBeam
        start={[colX(3.5), 0.3, rowZ(6)]}
        end={[colX(5.5), 0.3, rowZ(6)]}
        color="#4488ff"
        thickness={0.01}
        opacity={0.2}
      />

      {/* ─── Meeting → The Office → Lounge corridor ─── */}
      <ParticleBeam
        start={[colX(6.5), 0.5, rowZ(6)]}
        end={[colX(8.5), 0.5, rowZ(6)]}
        color="#8844ff"
        count={45}
        speed={2.5}
        thickness={0.02}
      />
      <NeonBeam
        start={[colX(6.5), 0.3, rowZ(6)]}
        end={[colX(8.5), 0.3, rowZ(6)]}
        color="#8844ff"
        thickness={0.01}
        opacity={0.2}
      />

      {/* ─── Lounge to corridor uplink ─── */}
      <ParticleBeam
        start={[colX(8.5), 0.5, rowZ(3)]}
        end={[colX(8.5), 0.5, rowZ(4.5)]}
        color="#ff44ff"
        count={50}
        speed={3.0}
        thickness={0.025}
      />
      <NeonBeam
        start={[colX(8.5), 0.3, rowZ(3)]}
        end={[colX(8.5), 0.3, rowZ(4.5)]}
        color="#ff00ff"
        thickness={0.01}
        opacity={0.25}
      />

      {/* ─── Server Room ↔ Data Centre vertical backbone ─── */}
      <ParticleBeam
        start={[colX(0.5), 0.8, rowZ(1.5)]}
        end={[colX(0.5), 0.8, rowZ(5.5)]}
        color="#ff4488"
        count={70}
        speed={2.0}
        thickness={0.03}
      />
      <NeonBeam
        start={[colX(0.5), 0.6, rowZ(1.5)]}
        end={[colX(0.5), 0.6, rowZ(5.5)]}
        color="#ff0044"
        thickness={0.012}
        opacity={0.2}
      />

      {/* ─── Gateway Nodes — strategic network junctions ─── */}
      <GatewayNode position={[colX(6), 0.35, rowZ(1)]} color="#ffaa00" />
      <GatewayNode position={[colX(6), 0.35, rowZ(4.5)]} color="#00ccff" size={0.18} />
      <GatewayNode position={[colX(1), 0.35, rowZ(5.5)]} color="#00ff88" />
      <GatewayNode position={[colX(3), 0.35, rowZ(6)]} color="#00ccff" />
      <GatewayNode position={[colX(5.5), 0.35, rowZ(6)]} color="#4488ff" />
      <GatewayNode position={[colX(8.5), 0.35, rowZ(6)]} color="#8844ff" />
    </group>
  )
}
