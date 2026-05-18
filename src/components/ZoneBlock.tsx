import React, { useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { ZoneConfig } from '../data/zones'

interface ZoneBlockProps {
  zone: ZoneConfig
  gridCols: number
  gridRows: number
  onClick: (zone: ZoneConfig) => void
  isSelected: boolean
  isHovered: boolean
  onHover: (id: string | null) => void
}

export default function ZoneBlock({ zone, gridCols, gridRows, onClick, isSelected, isHovered, onHover }: ZoneBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  
  const floorWidth = gridCols * 1.5
  const floorDepth = gridRows * 1.5
  const cellW = floorWidth / gridCols
  const cellD = floorDepth / gridRows
  
  const x = zone.col * cellW + (zone.colSpan * cellW) / 2 - floorWidth / 2
  const z = -(zone.row * cellD + (zone.rowSpan * cellD) / 2 - floorDepth / 2)
  const width = zone.colSpan * cellW
  const depth = zone.rowSpan * cellD
  
  const color = new THREE.Color(zone.color)
  const baseHeight = 0.15
  const hoverHeight = isHovered ? 0.35 : baseHeight
  const selHeight = isSelected ? 0.5 : hoverHeight

  useFrame((_, delta) => {
    if (meshRef.current) {
      const target = selHeight
      meshRef.current.position.y += (target - meshRef.current.position.y) * Math.min(delta * 8, 1)
      // Subtle glow pulse
      if (isHovered || isSelected) {
        const emissive = meshRef.current.material as THREE.MeshStandardMaterial
        emissive.emissiveIntensity += (0.3 - emissive.emissiveIntensity) * Math.min(delta * 6, 1)
      }
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick(zone)
  }

  return (
    <group>
      {/* Zone floor plate */}
      <mesh
        ref={meshRef}
        position={[x, 0.01, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(zone.id) }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); onHover(null) }}
      >
        <planeGeometry args={[width * 0.98, depth * 0.98]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.12}
          emissive={color}
          emissiveIntensity={isSelected ? 0.25 : isHovered ? 0.15 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Zone border — rectangular frame (4 edge strips, inset from zone boundaries) */}
      {(() => {
        const inset = 0.04
        return [
          { bx: x, bz: z - depth / 2 + inset, bw: width - inset * 2, bd: 0.03 },
          { bx: x, bz: z + depth / 2 - inset, bw: width - inset * 2, bd: 0.03 },
          { bx: x - width / 2 + inset, bz: z, bw: 0.03, bd: depth - inset * 2 },
          { bx: x + width / 2 - inset, bz: z, bw: 0.03, bd: depth - inset * 2 },
        ].map((edge, i) => (
          <mesh key={`edge-${i}`} position={[edge.bx, 0.03, edge.bz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[edge.bw, edge.bd]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={isSelected ? 0.85 : 0.3}
              emissive={color}
              emissiveIntensity={isSelected ? 0.4 : 0.08}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))
      })()}

      {/* Zone label */}
      <Text
        position={[x, 0.1, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.02}
        outlineColor="#0a0e14"
      >
        {zone.icon}
      </Text>
      <Text
        position={[x, 0.06, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.14}
        color={isSelected ? '#e6eaf0' : '#6c7a8d'}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
        outlineWidth={0.01}
        outlineColor="#0a0e14"
      >
        {zone.label}
      </Text>
    </group>
  )
}
