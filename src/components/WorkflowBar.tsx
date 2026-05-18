import React, { useState } from 'react'
import { WORKFLOW_PHASES, WorkflowPhase } from '../data/zones'
import { SpecialistData } from '../App'

interface WorkflowBarProps {
  activePhase: string
  onPhaseClick?: (phaseId: string) => void
  specialists?: SpecialistData[]
}

export default function WorkflowBar({ activePhase, onPhaseClick, specialists }: WorkflowBarProps) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null)

  const activeIdx = WORKFLOW_PHASES.findIndex(p => p.id === activePhase)

  return (
    <div className="wf-bar">
      <div className="wf-bar-inner">
        {WORKFLOW_PHASES.map((phase, idx) => {
          const isActive = phase.id === activePhase
          const isPast = activeIdx >= 0 && idx <= activeIdx
          const isHovered = hoveredPhase === phase.id

          return (
            <React.Fragment key={phase.id}>
              {/* Phase button */}
              <button
                className={`wf-phase ${isActive ? 'wf-phase-active' : ''} ${isPast ? 'wf-phase-past' : ''}`}
                style={{
                  '--phase-color': phase.color,
                  '--phase-glow': isActive || isHovered ? phase.color : 'transparent',
                } as React.CSSProperties}
                onClick={() => onPhaseClick?.(phase.id)}
                onMouseEnter={() => setHoveredPhase(phase.id)}
                onMouseLeave={() => setHoveredPhase(null)}
                title={phase.label}
              >
                <span className="wf-phase-icon">{phase.icon}</span>
                <span className="wf-phase-label">{phase.label}</span>
              </button>

              {/* Arrow connector */}
              {idx < WORKFLOW_PHASES.length - 1 && (
                <div className={`wf-arrow ${isPast && idx < activeIdx ? 'wf-arrow-done' : ''}`}>
                  <svg width="24" height="12" viewBox="0 0 24 12">
                    <line
                      x1="0" y1="6" x2="20" y2="6"
                      stroke={isPast && idx < activeIdx ? phase.color : '#1e2a3a'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="14,2 20,6 14,10"
                      fill="none"
                      stroke={isPast && idx < activeIdx ? phase.color : '#1e2a3a'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Phase progress bar */}
      <div className="wf-progress-track">
        <div
          className="wf-progress-fill"
          style={{
            width: `${((activeIdx + 1) / WORKFLOW_PHASES.length) * 100}%`,
            backgroundColor: WORKFLOW_PHASES[Math.max(0, activeIdx)]?.color || '#6b7280',
          }}
        />
      </div>

      {/* Specialist phase indicators */}
      {specialists && specialists.length > 0 && (
        <div className="wf-specialists">
          {WORKFLOW_PHASES.map((phase) => {
            const phaseSpecs = specialists.filter(s => (s.status || 'idle') === phase.id)
            if (phaseSpecs.length === 0) return null
            return (
              <div key={phase.id} className="wf-phase-group">
                <span className="wf-phase-dot" style={{ backgroundColor: phase.color }} />
                {phaseSpecs.map((spec) => (
                  <span key={spec.name} className="wf-spec-chip" title={`${spec.task || phase.label}`}>
                    {spec.emoji}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .wf-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 16px 6px;
          background: rgba(19, 24, 32, 0.95);
          border-bottom: 1px solid rgba(30, 42, 58, 0.5);
          backdrop-filter: blur(8px);
        }
        .wf-bar-inner {
          display: flex;
          align-items: center;
          gap: 0;
          flex-wrap: wrap;
          justify-content: center;
        }
        .wf-phase {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: #6c7a8d;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .wf-phase:hover {
          background: rgba(255,255,255,0.03);
          color: #bfc7d5;
        }
        .wf-phase-active {
          background: rgba(57, 186, 230, 0.1) !important;
          border-color: var(--phase-color) !important;
          color: var(--phase-color) !important;
          box-shadow: 0 0 12px var(--phase-glow);
        }
        .wf-phase-past {
          color: #9ca3af;
          opacity: 0.7;
        }
        .wf-phase-icon {
          font-size: 16px;
          line-height: 1;
        }
        .wf-phase-label {
          font-weight: 500;
          font-size: 11px;
        }
        .wf-arrow {
          display: flex;
          align-items: center;
          opacity: 0.5;
        }
        .wf-arrow-done {
          opacity: 1;
        }
        .wf-progress-track {
          width: 100%;
          max-width: 600px;
          height: 3px;
          background: #1e2a3a;
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .wf-progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease, background-color 0.5s ease;
        }
        .wf-specialists {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .wf-phase-group {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .wf-phase-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          opacity: 0.8;
          flex-shrink: 0;
        }
        .wf-spec-chip {
          font-size: 13px;
          line-height: 1;
          cursor: default;
          opacity: 0.85;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .wf-spec-chip:hover {
          opacity: 1;
          transform: scale(1.15);
        }
      `}</style>
    </div>
  )
}
