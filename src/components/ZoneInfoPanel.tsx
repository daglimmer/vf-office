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
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'rgba(19, 24, 32, 0.95)',
          border: `1px solid ${zone.color}44`,
          boxShadow: `0 0 20px ${zone.color}11`,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{zone.icon}</span>
            <h3 className="text-sm font-bold" style={{ color: zone.color }}>
              {zone.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6c7a8d] hover:text-[#bfc7d5] text-lg leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-[#6c7a8d] leading-relaxed">{zone.description}</p>

        {/* Zone-specific stats */}
        <div className="mt-3 pt-3 border-t border-[#1e2a3a]">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6c7a8d]">Status:</span>
            <span className="text-[#7fd962]">● Online</span>
          </div>
          {zone.id === 'server_room' || zone.id === 'datacenter' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Racks</span>
                <span className="text-[#bfc7d5] font-mono">3</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Hosts</span>
                <span className="text-[#bfc7d5] font-mono">9</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Uplink</span>
                <span className="text-[#7fd962] font-mono">10G ▲</span>
              </div>
            </div>
          ) : zone.id === 'patch_room' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Switches</span>
                <span className="text-[#bfc7d5] font-mono">7</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Active Ports</span>
                <span className="text-[#7fd962] font-mono">46/48</span>
              </div>
            </div>
          ) : zone.id === 'oly_office' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Desks</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Chairs</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Monitors</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Bookshelf</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
            </div>
          ) : zone.id === 'meeting' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Conference Table</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Chairs</span>
                <span className="text-[#bfc7d5] font-mono">8</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Screen</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
            </div>
          ) : zone.id === 'the_office' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Desks</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Chairs</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Monitors</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Filing Cabinet</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
            </div>
          ) : zone.id === 'lounge' ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Couches</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Armchairs</span>
                <span className="text-[#bfc7d5] font-mono">2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Meeting Table</span>
                <span className="text-[#bfc7d5] font-mono">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6c7a8d]">Whiteboard</span>
                <span className="text-[#bfc7d5] font-mono">✅</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
