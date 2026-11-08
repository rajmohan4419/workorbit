import { memo } from 'react';

/**
 * AmbientBackground — GPU-accelerated Category-Aware Ambient Background System.
 *
 * Layers:
 * 1. Ambient Aurora Orbs (drifting blurred radial spheres with dynamic theme colors)
 * 2. Masked Architectural Grid (fade-to-edge dot matrix / grid)
 * 3. Orbital Ring Watermark (delicate rotating celestial coordinate watermark on landing)
 *
 * Props:
 * - mode: 'landing' | 'workspace' (attenuates glow by 45% in workspace for max contrast)
 * - theme: 'orbit' | 'finance' | 'business' | 'developer' | 'career' | 'pdf' | 'spreadsheet' | 'everyday' | 'media'
 */
export const AmbientBackground = memo(function AmbientBackground({
  mode = 'landing',
  theme = 'orbit',
  className = '',
}) {
  const isWorkspace = mode === 'workspace';

  return (
    <div
      aria-hidden="true"
      data-category-theme={theme}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-700 ${className}`}
    >
      {/* ── Layer 1: Ambient Aurora Orbs (GPU composited) ── */}
      <div
        className="absolute -top-[12vw] -left-[10vw] w-[55vw] h-[55vw] min-w-[380px] min-h-[380px] max-w-[850px] max-h-[850px] rounded-full filter blur-[95px] animate-aurora-1 will-change-transform"
        style={{
          background: 'radial-gradient(circle at 45% 45%, var(--bg-glow-1) 0%, transparent 70%)',
          opacity: isWorkspace ? 0.85 : 1,
          transition: 'opacity 600ms ease, background 600ms ease',
        }}
      />

      <div
        className="absolute -bottom-[12vw] -right-[10vw] w-[55vw] h-[55vw] min-w-[380px] min-h-[380px] max-w-[850px] max-h-[850px] rounded-full filter blur-[95px] animate-aurora-2 will-change-transform"
        style={{
          background: 'radial-gradient(circle at 55% 55%, var(--bg-glow-2) 0%, transparent 70%)',
          opacity: isWorkspace ? 0.85 : 1,
          transition: 'opacity 600ms ease, background 600ms ease',
        }}
      />

      {/* ── Layer 2: Masked Architectural Grid Matrix ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--bg-accent-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--bg-accent-grid) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 25%, #000 35%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 25%, #000 35%, transparent 100%)',
          opacity: isWorkspace ? 0.75 : 0.95,
          transition: 'opacity 600ms ease',
        }}
      />

      {/* ── Layer 3: Concentric Orbital Ring System (Landing/Hero Only) ── */}
      {!isWorkspace && (
        <div className="absolute top-[20vh] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] pointer-events-none opacity-35 dark:opacity-25 transition-opacity duration-700">
          <svg
            viewBox="0 0 800 800"
            className="w-full h-full animate-orbital-rings"
            fill="none"
          >
            {/* Concentric rings */}
            <circle cx="400" cy="400" r="160" stroke="var(--bg-accent-grid)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="400" cy="400" r="240" stroke="var(--bg-accent-grid)" strokeWidth="1.2" />
            <circle cx="400" cy="400" r="330" stroke="var(--bg-accent-grid)" strokeWidth="1" strokeDasharray="8 8" />
            <ellipse cx="400" cy="400" rx="380" ry="190" stroke="var(--bg-accent-grid)" strokeWidth="1" transform="rotate(-25 400 400)" />

            {/* Orbiting celestial node accents */}
            <circle cx="640" cy="400" r="3.5" fill="var(--orbit-accent, #6366f1)" opacity="0.65" />
            <circle cx="230" cy="270" r="2.5" fill="var(--orbit-amber, #f59e0b)" opacity="0.6" />
          </svg>
        </div>
      )}
    </div>
  );
});

export default AmbientBackground;

