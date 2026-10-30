export function OrbitBoardIcon({ size = 32, className = '', variant = 'color' }) {
  const isMono = variant === 'mono-black' || variant === 'mono-white';
  const monoColor = variant === 'mono-white' ? '#FFFFFF' : '#000000';

  if (size <= 36) {
    // 32x32 Micro-optimized pixel geometry
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`o-32-${variant}`} x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="50%" stop-color="#0284C7"/>
            <stop offset="100%" stop-color="#0369A1"/>
          </linearGradient>

          <linearGradient id={`ring-32-${variant}`} x1="2" y1="20" x2="28" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#00E5FF"/>
            <stop offset="40%" stop-color="#A855F7"/>
            <stop offset="75%" stop-color="#F43F5E"/>
            <stop offset="100%" stop-color="#FB923C"/>
          </linearGradient>

          <radialGradient id={`sat-32-${variant}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FEF08A"/>
            <stop offset="40%" stop-color="#FB923C"/>
            <stop offset="100%" stop-color="#E11D48"/>
          </radialGradient>

          <mask id={`mask-32-${variant}`}>
            <rect width="32" height="32" fill="#FFFFFF"/>
            <ellipse cx="15.5" cy="15.5" rx="8" ry="9.5" fill="#000000" transform="rotate(-18 15.5 15.5)"/>
          </mask>

          <clipPath id={`clip-32-${variant}`}>
            <path d="M 0 14 L 32 21 L 26 32 L 0 32 Z"/>
          </clipPath>
        </defs>

        {/* Back ring */}
        <g mask={`url(#mask-32-${variant})`}>
          <ellipse cx="15.5" cy="15.5" rx="12.5" ry="5.8" 
            fill="none" 
            stroke={isMono ? monoColor : `url(#ring-32-${variant})`} 
            stroke-width="2.6" 
            stroke-linecap="round"
            transform="rotate(-28 15.5 15.5)"
          />
        </g>

        {/* Central O */}
        <g transform="rotate(-18 15.5 15.5)">
          <path d="M 15.5 7.5
                   C 19.8 7.5, 23 11, 23 15.5
                   C 23 20, 19.8 23.5, 15.5 23.5
                   C 11.2 23.5, 8 20, 8 15.5
                   C 8 11, 11.2 7.5, 15.5 7.5 Z
                   M 15.5 11.2
                   C 13.2 11.2, 11.6 13, 11.6 15.5
                   C 11.6 18, 13.2 19.8, 15.5 19.8
                   C 17.8 19.8, 19.4 18, 19.4 15.5
                   C 19.4 13, 17.8 11.2, 15.5 11.2 Z"
                fill={isMono ? monoColor : `url(#o-32-${variant})`}
                fillRule="evenodd"
          />
          {!isMono && <path d="M 11 11 C 12.5 9 14.5 8.2 17 8.5 C 15 9.2 13.5 10.5 12.5 12 Z" fill="#BAE6FD"/>}
        </g>

        {/* Front ring */}
        <g clipPath={`url(#clip-32-${variant})`}>
          <ellipse cx="15.5" cy="15.5" rx="12.5" ry="5.8" 
            fill="none" 
            stroke={isMono ? monoColor : `url(#ring-32-${variant})`} 
            stroke-width="2.6" 
            stroke-linecap="round"
            transform="rotate(-28 15.5 15.5)"
          />
        </g>

        {/* Satellite */}
        <circle cx="24.8" cy="9.2" r="3" fill={isMono ? monoColor : `url(#sat-32-${variant})`}/>
        {!isMono && <circle cx="24.2" cy="8.6" r="1" fill="#FFFFFF" opacity="0.8"/>}
      </svg>
    );
  }

  // Full-fidelity vector icon
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 160 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`o-full-${variant}`} x1="45" y1="25" x2="115" y2="125" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="35%" stop-color="#0284C7"/>
          <stop offset="75%" stop-color="#0369A1"/>
          <stop offset="100%" stop-color="#075985"/>
        </linearGradient>

        <linearGradient id={`rim-full-${variant}`} x1="60" y1="35" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#7DD3FC"/>
          <stop offset="50%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0C4A6E"/>
        </linearGradient>

        <linearGradient id={`ring-full-${variant}`} x1="20" y1="95" x2="140" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="35%" stop-color="#818CF8"/>
          <stop offset="60%" stop-color="#C084FC"/>
          <stop offset="85%" stop-color="#F43F5E"/>
          <stop offset="100%" stop-color="#FB923C"/>
        </linearGradient>

        <radialGradient id={`sat-full-${variant}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FDE047"/>
          <stop offset="35%" stop-color="#FB923C"/>
          <stop offset="75%" stop-color="#E11D48"/>
          <stop offset="100%" stop-color="#831843"/>
        </radialGradient>

        <mask id={`back-mask-${variant}`}>
          <rect width="160" height="160" fill="#FFFFFF"/>
          <ellipse cx="80" cy="76" rx="36" ry="43" fill="#000000" transform="rotate(-18 80 76)"/>
        </mask>

        <clipPath id={`front-clip-${variant}`}>
          <path d="M 0 65 L 160 100 L 140 160 L 0 160 Z"/>
        </clipPath>
      </defs>

      {/* Back ring */}
      <g mask={`url(#back-mask-${variant})`}>
        <ellipse cx="80" cy="75" rx="68" ry="30" 
          fill="none" 
          stroke={isMono ? monoColor : `url(#ring-full-${variant})`} 
          stroke-width="7" 
          transform="rotate(-28 80 75)"
        />
      </g>

      {/* Central O */}
      <g transform="rotate(-18 80 76)">
        <path d="M 80 34
                 C 101 34, 116 52, 116 76
                 C 116 100, 101 118, 80 118
                 C 59 118, 44 100, 44 76
                 C 44 52, 59 34, 80 34 Z
                 M 80 54
                 C 69 54, 62 64, 62 76
                 C 62 88, 69 98, 80 98
                 C 91 98, 98 88, 98 76
                 C 98 64, 91 54, 80 54 Z"
              fill={isMono ? monoColor : `url(#o-full-${variant})`}
              fillRule="evenodd"
        />
        {!isMono && (
          <path d="M 58 46
                   C 67 37, 81 35, 94 38
                   C 87 41, 74 43, 68 52
                   C 63 60, 62 69, 62 76
                   C 60 70, 58 60, 58 46 Z"
                fill={`url(#rim-full-${variant})`}
                opacity="0.85"
          />
        )}
      </g>

      {/* Front ring */}
      <g clipPath={`url(#front-clip-${variant})`}>
        <ellipse cx="80" cy="75" rx="68" ry="30" 
          fill="none" 
          stroke={isMono ? monoColor : `url(#ring-full-${variant})`} 
          stroke-width="7" 
          transform="rotate(-28 80 75)"
        />
        {!isMono && (
          <ellipse cx="80" cy="75" rx="68" ry="30" 
            fill="none" 
            stroke="#FFFFFF" 
            stroke-width="1.8" 
            stroke-opacity="0.7"
            transform="rotate(-28 80 75)"
          />
        )}
      </g>

      {/* Satellite */}
      <circle cx="129" cy="42" r="9.5" fill={isMono ? monoColor : `url(#sat-full-${variant})`}/>
      {!isMono && <circle cx="127" cy="40" r="2.8" fill="#FFFFFF" opacity="0.85"/>}
    </svg>
  );
}
export default OrbitBoardIcon;

