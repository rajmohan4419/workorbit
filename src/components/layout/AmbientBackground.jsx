import { memo } from 'react';

/**
 * AmbientBackground — Clean, subtle architectural background system.
 * Follows global enterprise standards (Stripe/Linear/Vercel) with soft top-lighting
 * and high-contrast, distraction-free surfaces.
 *
 * Props:
 * - mode: 'landing' | 'workspace'
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
      {/* ── Layer 1: Subtle Diffuse Top Lighting ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[480px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 45% at 50% -10%, var(--bg-glow-1) 0%, transparent 75%)',
          opacity: isWorkspace ? 0.6 : 0.9,
          transition: 'opacity 600ms ease',
        }}
      />

      {/* ── Layer 2: Masked Architectural Precision Grid ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--bg-accent-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--bg-accent-grid) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 20%, #000 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 20%, #000 30%, transparent 100%)',
          opacity: isWorkspace ? 0.45 : 0.75,
          transition: 'opacity 600ms ease',
        }}
      />
    </div>
  );
});

export default AmbientBackground;
