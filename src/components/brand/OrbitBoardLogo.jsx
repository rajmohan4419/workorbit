import { OrbitBoardIcon } from './OrbitBoardIcon';

export function OrbitBoardLogo({ 
  variant = 'auto', 
  showTagline = false, 
  className = '',
  iconSize = 38 
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Brand Icon */}
      <div className="shrink-0">
        {variant === 'auto' ? (
          <>
            <OrbitBoardIcon size={iconSize} variant="color" className="block dark:hidden" />
            <OrbitBoardIcon size={iconSize} variant="color" className="hidden dark:block" />
          </>
        ) : (
          <OrbitBoardIcon size={iconSize} variant={variant} />
        )}
      </div>

      {/* Typography Lockup */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline text-2xl font-black tracking-tight leading-none">
          {variant === 'mono-black' ? (
            <span className="text-black">OrbitBoard</span>
          ) : variant === 'mono-white' ? (
            <span className="text-white">OrbitBoard</span>
          ) : variant === 'light' ? (
            <>
              <span className="text-slate-900">Orbit</span>
              <span className="bg-gradient-to-r from-sky-600 via-indigo-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent">
                Board
              </span>
            </>
          ) : variant === 'dark' ? (
            <>
              <span className="text-white">Orbit</span>
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                Board
              </span>
            </>
          ) : (
            <>
              <span className="text-stone-900 dark:text-white transition-colors">Orbit</span>
              <span className="bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">
                Board
              </span>
            </>
          )}
        </div>

        {showTagline && (
          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold tracking-[0.22em] uppercase text-stone-500 dark:text-stone-400">
            <span>PLAN</span>
            <span className="w-1 h-1 rounded-full bg-sky-400" />
            <span>BUILD</span>
            <span className="w-1 h-1 rounded-full bg-purple-500" />
            <span>DO</span>
            <span className="w-1 h-1 rounded-full bg-orange-400" />
            <span>TOGETHER</span>
          </div>
        )}
      </div>
    </div>
  );
}
export default OrbitBoardLogo;

