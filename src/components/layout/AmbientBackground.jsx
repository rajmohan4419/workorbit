import { memo } from 'react';

/**
 * AmbientBackground — ClickUp-style soft gradient blob background.
 * Clean white base with a soft purple/indigo gradient blob in the bottom corner.
 */

// Theme-based gradient colors
const themeGradients = {
  orbit:       ['#7c3aed', '#6366f1'],
  default:     ['#7c3aed', '#6366f1'],
  finance:     ['#059669', '#0891b2'],
  business:    ['#2563eb', '#7c3aed'],
  developer:   ['#4f46e5', '#0ea5e9'],
  career:      ['#0ea5e9', '#6366f1'],
  pdf:         ['#e11d48', '#7c3aed'],
  spreadsheet: ['#059669', '#2563eb'],
  everyday:    ['#ea580c', '#db2777'],
  media:       ['#db2777', '#7c3aed'],
};

export const AmbientBackground = memo(function AmbientBackground({
  mode = 'landing',
  theme = 'orbit',
  className = '',
}) {
  const isWorkspace = mode === 'workspace';
  const [c1, c2] = themeGradients[theme] || themeGradients.orbit;

  return (
    <div
      aria-hidden="true"
      data-category-theme={theme}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
    >
      {/* White/near-white base is from --orbit-canvas on <html> */}

      {/* ── Soft blob — bottom-right, like ClickUp ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-120px',
          right: '-120px',
          width: '620px',
          height: '480px',
          background: `radial-gradient(ellipse at 70% 80%, ${c1}22 0%, ${c2}18 40%, transparent 70%)`,
          borderRadius: '60% 40% 50% 60% / 50% 60% 40% 50%',
          opacity: isWorkspace ? 0.5 : 0.85,
          transition: 'opacity 600ms ease, background 700ms ease',
          filter: 'blur(2px)',
        }}
      />

      {/* ── Soft blob — top-left ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-80px',
          left: '-80px',
          width: '500px',
          height: '400px',
          background: `radial-gradient(ellipse at 30% 20%, ${c2}18 0%, ${c1}10 50%, transparent 70%)`,
          borderRadius: '50% 60% 40% 50% / 60% 40% 60% 40%',
          opacity: isWorkspace ? 0.3 : 0.6,
          transition: 'opacity 600ms ease, background 700ms ease',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
});

export default AmbientBackground;
