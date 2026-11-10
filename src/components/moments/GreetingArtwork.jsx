import { useId } from 'react';

export default function GreetingArtwork({ occasion }) {
  const id = useId();
  const fill = `url(#${id}-metal)`;
  const flame = `url(#${id}-flame)`;

  return (
    <svg className="moment-artwork" viewBox="0 0 240 164" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} x2=".28" y2="1">
          <stop stopColor="var(--moment-highlight)" />
          <stop offset=".48" stopColor="var(--moment-accent)" />
          <stop offset="1" stopColor="var(--moment-metal)" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x2="0" y2="1">
          <stop stopColor="#fff0a5" />
          <stop offset=".63" stopColor="#ffbd58" />
          <stop offset="1" stopColor="#ed773d" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="var(--moment-accent)" strokeWidth="1" opacity=".29">
        <circle cx="120" cy="76" r="65" />
        <circle cx="120" cy="76" r="75" strokeDasharray="1 6" />
        <path d="M37 77H20m183 0h17M120 1v10m0 131v10" />
      </g>
      <g fill="var(--moment-highlight)" opacity=".75">
        <path d="M47 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2zm142 56 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <circle cx="184" cy="36" r="2" />
        <circle cx="59" cy="113" r="1.5" />
      </g>
      {occasion === 'diwali' && <>
        <ellipse cx="120" cy="139" rx="62" ry="5" fill="var(--moment-accent)" opacity=".19" />
        <path d="M62 104h116c-8 22-28 31-58 31s-50-9-58-31Z" fill={fill} />
        <path d="M71 113q49 29 98 0" fill="none" stroke="#ffe0a0" strokeWidth="1.5" opacity=".82" />
        <path d="M103 135h34l5 5H98Z" fill={fill} />
        <ellipse cx="120" cy="104" rx="58" ry="9" fill="#30121b" stroke="var(--moment-accent)" strokeWidth="2" />
        <ellipse cx="120" cy="104" rx="46" ry="5" fill="#a94e25" opacity=".74" />
        <path d="M116 104q5-4 6-12" fill="none" stroke="#ffe0a0" strokeWidth="2.5" strokeLinecap="round" />
        <g className="moment-flame">
          <path d="M121 33c4 24 19 32 19 47 0 12-9 20-21 20-11 0-19-8-19-19 0-15 13-25 21-48Z" fill={flame} />
          <path d="M122 62c1 14 9 19 9 27 0 6-5 11-12 11s-11-5-11-11c0-8 8-14 14-27Z" fill="#fff5ca" />
        </g>
      </>}
      {occasion === 'birthday' && <>
        <path d="M77 94h86v32H77z" fill={fill} />
        <path d="M77 89h86v11c-9 10-14-5-22 1s-11 4-18 0-11 5-18 1-13 6-28-2Z" fill="var(--moment-highlight)" />
        <path d="M67 129h106m-77 7h48M99 89V65m21 24V59m21 30V65" stroke="var(--moment-accent)" strokeWidth="4" strokeLinecap="round" />
        <path d="M99 50q-10 13 0 13t0-13Zm21-8q-11 14 0 14t0-14Zm21 8q-10 13 0 13t0-13Z" fill="var(--moment-highlight)" className="moment-art-spark" />
      </>}
      {occasion === 'anniversary' && <>
        <g fill="none" stroke={fill} strokeWidth="6">
          <ellipse cx="105" cy="87" rx="24" ry="32" transform="rotate(-24 105 87)" />
          <ellipse cx="136" cy="87" rx="24" ry="32" transform="rotate(24 136 87)" />
        </g>
        <path d="M129 57l8-14h14l7 14-15 15Z" fill={fill} stroke="var(--moment-highlight)" strokeWidth="1.5" />
        <path d="M144 37v-9m15 13 7-6m-37 6-7-6" stroke="var(--moment-highlight)" strokeWidth="2" strokeLinecap="round" className="moment-art-spark" />
      </>}
      {occasion === 'announcement' && <>
        <path d="M68 83h36l54-24v63l-54-24H68a8 8 0 0 1-8-8 7 7 0 0 1 8-7Z" fill={fill} />
        <path d="m83 98 12 27h16l-10-27m5-14v14m49-40v66" fill="none" stroke="var(--moment-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m169 74 15-10m-11 26h18m-22 15 15 10" fill="none" stroke="var(--moment-highlight)" strokeWidth="3" strokeLinecap="round" className="moment-art-spark" />
      </>}
      {occasion === 'celebrations' && <>
        <path d="m78 128 23-61 43 40-66 21Z" fill={fill} />
        <path d="m90 97 22 19m-28-2 9 8m5-41 31 30" stroke="var(--moment-highlight)" strokeWidth="2.5" opacity=".9" />
        <g className="moment-art-spark" fill="none" stroke="var(--moment-highlight)" strokeWidth="3" strokeLinecap="round">
          <path d="M124 77q7-7 4-14t7-16m7 41q7-10 17-7t14-6m-18-11 9-10m-24 5 2-11m14 55 15-1" />
          <circle cx="111" cy="52" r="2" /><circle cx="181" cy="61" r="2" /><circle cx="178" cy="92" r="2" />
        </g>
      </>}
    </svg>
  );
}
