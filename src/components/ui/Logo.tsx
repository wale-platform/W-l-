import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Geometric 'W' with architectural precision */}
      <g stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        {/* Left main leg */}
        <line x1="20" y1="20" x2="38" y2="76" />
        {/* Right main leg */}
        <line x1="80" y1="20" x2="62" y2="76" />
        
        {/* Inner diagonal support structure forming the house roof at the center */}
        <path d="M38 76 L50 48 L62 76" fill="none" />
      </g>
      
      {/* House structure integrated in the lower central negative space */}
      {/* Roof of the house in the center */}
      <path d="M50 48 L60 58 H40 Z" fill="currentColor" />
      {/* Body of the house */}
      <path d="M42 58 H58 V76 H42 Z" fill="currentColor" />
      
      {/* Cutout window in the house */}
      <rect x="47" y="63" width="6" height="6" rx="1" className="fill-[#071426] group-hover:fill-white" fill="#071426" />
      
      {/* Decorative technical coordinate / crosshair mark inside the logo (blueprint theme) */}
      <circle cx="50" cy="24" r="3" fill="#FF6B4A" />
      <line x1="50" y1="16" x2="50" y2="32" stroke="#FF6B4A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="24" x2="58" y2="24" stroke="#FF6B4A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
