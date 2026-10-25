const visualKind = (slug) => {
  if (['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'].includes(slug)) return 'career';
  if (['emi', 'gst', 'sip'].includes(slug)) return 'finance';
  if (['json-formatter', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'base64', 'jwt-decoder', 'unix-timestamp', 'uuid-generator', 'url-encoder', 'diff-checker'].includes(slug)) return 'code';
  if (slug.includes('xlsx') || slug.includes('csv')) return 'sheet';
  if (slug.includes('pdf') || slug === 'txt-to-pdf') return 'pdf';
  if (slug.includes('image') || ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'svg-to-png'].includes(slug)) return 'image';
  if (slug.includes('converter') || slug === 'percentage') return 'convert';
  return 'tool';
};

export function ToolVisual({ tool, compact = false }) {
  const kind = visualKind(tool.slug);
  const height = compact ? 'h-11 w-14' : 'h-36 w-full';
  const label = tool.icon;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-accent-950/40 ${height}`} aria-hidden="true">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,.35),transparent_35%)]" />
      <svg viewBox="0 0 320 150" className="relative h-full w-full" fill="none">
        {kind === 'career' && <>
          <rect x="35" y="28" width="150" height="96" rx="12" fill="rgba(15,23,42,.9)" stroke="rgba(167,139,250,.45)" />
          <rect x="54" y="46" width="55" height="8" rx="4" fill="rgba(167,139,250,.7)" />
          <rect x="54" y="65" width="92" height="6" rx="3" fill="rgba(148,163,184,.35)" />
          <rect x="54" y="80" width="72" height="6" rx="3" fill="rgba(148,163,184,.25)" />
          <circle cx="238" cy="72" r="38" fill="rgba(124,58,237,.18)" stroke="rgba(167,139,250,.6)" />
          <text x="238" y="84" textAnchor="middle" fontSize="34" fontWeight="800" fill="#c4b5fd">₹</text>
          <path d="M205 116 L230 102 L251 110 L284 82" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
        </>}
        {kind === 'finance' && <>
          <rect x="38" y="34" width="244" height="82" rx="16" fill="rgba(15,23,42,.92)" stroke="rgba(167,139,250,.45)" />
          <text x="58" y="65" fontSize="12" fill="#94a3b8">ESTIMATE</text>
          <text x="58" y="94" fontSize="27" fontWeight="800" fill="#f8fafc">₹ 12,500</text>
          <path d="M196 96 C216 68 235 86 253 60 C262 48 272 48 280 40" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        </>}
        {kind === 'code' && <>
          <rect x="38" y="25" width="244" height="100" rx="14" fill="rgba(2,6,23,.95)" stroke="rgba(56,189,248,.35)" />
          <circle cx="58" cy="43" r="4" fill="#fb7185" /><circle cx="72" cy="43" r="4" fill="#fbbf24" /><circle cx="86" cy="43" r="4" fill="#34d399" />
          <text x="58" y="72" fontFamily="monospace" fontSize="17" fill="#c4b5fd">{label === '{}' ? '{ }' : label}</text>
          <path d="M58 92 H177 M58 106 H143" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        </>}
        {kind === 'sheet' && <>
          <rect x="62" y="20" width="196" height="112" rx="10" fill="rgba(15,23,42,.94)" stroke="rgba(52,211,153,.45)" />
          {[0,1,2,3].map(i => <path key={i} d={`M62 ${48+i*21} H258`} stroke="rgba(71,85,105,.65)" />)}
          {[0,1,2,3,4].map(i => <path key={i} d={`M${101+i*39} 20 V132`} stroke="rgba(71,85,105,.65)" />)}
          <rect x="102" y="49" width="38" height="20" fill="rgba(52,211,153,.22)" />
          <rect x="141" y="70" width="38" height="20" fill="rgba(167,139,250,.18)" />
        </>}
        {kind === 'pdf' && <>
          <path d="M98 18 H197 L231 52 V132 H98 Z" fill="rgba(15,23,42,.95)" stroke="rgba(248,113,113,.45)" strokeWidth="2" />
          <path d="M197 18 V53 H231" stroke="rgba(248,113,113,.45)" strokeWidth="2" />
          <text x="115" y="86" fontSize="25" fontWeight="800" fill="#fca5a5">PDF</text>
          <path d="M117 103 H209 M117 115 H190" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        </>}
        {kind === 'image' && <>
          <rect x="44" y="27" width="232" height="98" rx="14" fill="rgba(15,23,42,.9)" stroke="rgba(96,165,250,.45)" />
          <circle cx="103" cy="58" r="13" fill="rgba(250,204,21,.8)" />
          <path d="M59 111 L118 74 L153 99 L190 68 L261 111 Z" fill="rgba(96,165,250,.28)" stroke="rgba(96,165,250,.7)" />
          <text x="214" y="52" textAnchor="middle" fontSize="12" fill="#bfdbfe">{label}</text>
        </>}
        {kind === 'convert' && <>
          <rect x="43" y="43" width="86" height="58" rx="12" fill="rgba(15,23,42,.95)" stroke="rgba(167,139,250,.45)" />
          <rect x="191" y="43" width="86" height="58" rx="12" fill="rgba(15,23,42,.95)" stroke="rgba(167,139,250,.45)" />
          <path d="M137 61 H183 M183 61 L173 53 M183 61 L173 69" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M183 83 H137 M137 83 L147 75 M137 83 L147 91" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="86" y="78" textAnchor="middle" fontSize="15" fontWeight="700" fill="#c4b5fd">{label}</text>
          <text x="234" y="78" textAnchor="middle" fontSize="15" fontWeight="700" fill="#a7f3d0">NEW</text>
        </>}
        {kind === 'tool' && <>
          <circle cx="160" cy="75" r="48" fill="rgba(124,58,237,.15)" stroke="rgba(167,139,250,.5)" />
          <text x="160" y="86" textAnchor="middle" fontSize="28" fontWeight="800" fill="#c4b5fd">{label}</text>
        </>}
      </svg>
      {!compact && <div className="absolute bottom-3 left-4 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur">{tool.category}</div>}
    </div>
  );
}

export function OrbitNode({ label, className }) {
  return <span className={`absolute inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-slate-500 backdrop-blur ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-accent-400" />{label}</span>;
}
