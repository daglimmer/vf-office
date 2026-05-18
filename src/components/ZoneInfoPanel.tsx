import React from 'react'
import { ZoneConfig, ZONES } from '../data/zones'

interface ZoneInfoPanelProps {
  zone: ZoneConfig | null
  onClose: () => void
}

export default function ZoneInfoPanel({ zone, onClose }: ZoneInfoPanelProps) {
  if (!zone) return null

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-20 animate-fade-in">
      <div
        className="rounded-lg p-4 cyber-panel"
        style={{
          backgroundColor: 'rgba(6, 10, 20, 0.94)',
          border: `1px solid ${zone.color}44`,
          boxShadow: `0 0 25px ${zone.color}22, 0 0 8px ${zone.color}11`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" style={{ filter: `drop-shadow(0 0 6px ${zone.color})` }}>{zone.icon}</span>
            <h3 className="text-sm font-bold" style={{ color: zone.color, textShadow: `0 0 8px ${zone.color}44` }}>
              {zone.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#556688] hover:text-[#8899cc] text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-[#8899bb] leading-relaxed">{zone.description}</p>

        <div className="mt-3 pt-3 border-t" style={{ borderColor: zone.color + '33' }}>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#556688]">Status:</span>
            <span className="text-[#00ff88] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 6px #00ff88' }} />
              Online
            </span>
          </div>
          {zone.id === 'server_room' || zone.id === 'datacenter' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Racks</span>
                <span className="text-[#c8d0e0] font-mono">3</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Hosts</span>
                <span className="text-[#c8d0e0] font-mono">9</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Uplink</span>
                <span className="text-[#00ff88] font-mono" style={{ textShadow: '0 0 4px #00ff8844' }}>10G ▲</span>
              </div>
            </div>
          ) : zone.id === 'patch_room' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Switches</span>
                <span className="text-[#c8d0e0] font-mono">7</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Active Ports</span>
                <span className="text-[#00ff88] font-mono" style={{ textShadow: '0 0 4px #00ff8844' }}>46/48</span>
              </div>
            </div>
          ) : zone.id === 'oly_office' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Desks</span>
                <span className="text-[#c8d0e0] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Monitors</span>
                <span className="text-[#c8d0e0] font-mono">2</span>
              </div>
            </div>
          ) : zone.id === 'meeting' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Conference Table</span>
                <span className="text-[#c8d0e0] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Chairs</span>
                <span className="text-[#c8d0e0] font-mono">8</span>
              </div>
            </div>
          ) : zone.id === 'the_office' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Tech Desks</span>
                <span className="text-[#c8d0e0] font-mono">6</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Monitors</span>
                <span className="text-[#c8d0e0] font-mono">6</span>
              </div>
            </div>
          ) : zone.id === 'lounge' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Couches</span>
                <span className="text-[#c8d0e0] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Armchairs</span>
                <span className="text-[#c8d0e0] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Whiteboard</span>
                <span className="text-[#c8d0e0] font-mono">✅</span>
              </div>
            </div>
          ) : zone.id === 'vault' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Vault Doors</span>
                <span className="text-[#c8d0e0] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#556688]">Security Level</span>
                <span className="text-[#ffaa00] font-mono" style={{ textShadow: '0 0 4px #ffaa0044' }}>MAX</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
