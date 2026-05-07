import React from 'react';

export function LogoIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className} 
      {...props}
    >
      {/* Golden Crown / Sunburst - Jagged like Lordaeron/Paladin crest */}
      <path 
        d="M50 10 L55 25 L75 18 L64 35 L85 38 L68 48 L80 62 L60 55 L50 75 L40 55 L20 62 L32 48 L15 38 L36 35 L25 18 L45 25 Z" 
        fill="#FFD700" 
        stroke="#B8860B"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Glow / inner detail of crown */}
      <path 
        d="M50 15 L53 28 L68 23 L60 36 L75 39 L62 46 L71 55 L55 50 L50 65 L45 50 L29 55 L38 46 L25 39 L40 36 L32 23 L47 28 Z" 
        fill="#FFEA70" 
      />

      {/* Dark Smoke/Shadows wrapping the blade - more stylized and wispy */}
      <path 
        d="M30 65 C 20 60, 15 75, 25 80 C 20 85, 30 95, 40 90 C 35 80, 48 70, 45 60 C 40 60, 35 70, 30 65 Z" 
        fill="#1e293b" 
        opacity="0.85"
      />
      <path 
        d="M70 65 C 80 60, 85 75, 75 80 C 80 85, 70 95, 60 90 C 65 80, 52 70, 55 60 C 60 60, 65 70, 70 65 Z" 
        fill="#1e293b" 
        opacity="0.85"
      />
      
      {/* Additional lower smoke wisps */}
      <path d="M45 85 Q 50 95 48 100 Q 38 95 42 88 Z" fill="#0f172a" opacity="0.6"/>
      <path d="M55 85 Q 50 95 52 100 Q 62 95 58 88 Z" fill="#0f172a" opacity="0.6"/>

      {/* Sword Blade - wider at the base, tapering sharply */}
      <path 
        d="M44 45 L56 45 L52 90 L50 95 L48 90 Z" 
        fill="#0f172a" 
        stroke="#0f172a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Sword Blade Edge highlight */}
      <path 
        d="M50 45 L56 45 L52 90 L50 95 Z" 
        fill="#1e293b" 
      />

      {/* Sword Crossguard - thick, winged */}
      <path 
        d="M34 40 C 40 38, 45 42, 50 45 C 55 42, 60 38, 66 40 C 68 45, 62 48, 56 48 L44 48 C 38 48, 32 45, 34 40 Z" 
        fill="#0f172a" 
        strokeLinejoin="round"
      />
      
      {/* Crossguard gold accent */}
      <path d="M45 44 L50 47 L55 44 L53 46 L50 48 L47 46 Z" fill="#FFD700" />

      {/* Sword Grip */}
      <path 
        d="M47 25 L53 25 L52 42 L48 42 Z" 
        fill="#334155" 
      />
      
      {/* Grip wraps (leather texture stripes) */}
      <path d="M47.5 28 L52.5 29 M47.5 32 L52.5 33 M48 36 L52 37 M48 40 L52 41" stroke="#0f172a" strokeWidth="1.5" />

      {/* Pommel - diamond shaped */}
      <path 
        d="M50 18 L54 22 L50 26 L46 22 Z" 
        fill="#0f172a" 
        strokeLinejoin="round"
      />
      {/* Pommel gem */}
      <circle cx="50" cy="22" r="1.5" fill="#3b82f6" />

      {/* Central inscribed rune / fuller on blade */}
      <path 
        d="M50 48 L50 85" 
        stroke="#3b82f6" 
        strokeWidth="1" 
        opacity="0.8"
      />
      
      {/* Rune marks on fuller */}
      <path d="M49 55 L51 55 M49 65 L51 65 M49 75 L51 75" stroke="#3b82f6" strokeWidth="0.5" />
    </svg>
  );
}
