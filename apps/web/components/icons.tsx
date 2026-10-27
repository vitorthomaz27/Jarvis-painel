import type { SVGProps } from 'react';

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const Mark = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" {...p}>
    <rect x="58" y="8" width="16" height="84" fill="currentColor" />
    <rect x="16" y="76" width="58" height="16" fill="currentColor" />
    <polygon points="20.18,39.50 56.18,77.50 67.82,66.50 31.82,28.50" fill="currentColor" />
  </svg>
);
export const IconHome = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /></svg>;
export const IconUsers = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>;
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 3.5V8h4.5" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20.5V16h-4.5" /></svg>;
export const IconCode = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" /></svg>;
export const IconTeam = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="11" r="2.5" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0M14.5 10h3.5M14.5 13.5h3.5" /></svg>;
export const IconShield = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" /></svg>;
export const IconUser = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
export const IconOut = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></svg>;
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconBack = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="m15 5-7 7 7 7" /></svg>;
export const IconWa = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38A9.95 9.95 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.2c-1.6 0-3.13-.43-4.45-1.24l-.32-.19-3.11.82.83-3.03-.21-.31A8.18 8.18 0 0 1 3.8 12c0-4.54 3.7-8.24 8.24-8.24S20.28 7.46 20.28 12s-3.7 8.2-8.24 8.2Zm4.52-6.14c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.45-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
  </svg>
);
