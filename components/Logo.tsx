
import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  onDark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", iconOnly = false, onDark = false }) => {
  return (
    <svg 
      viewBox={iconOnly ? "0 0 40 40" : "0 0 140 40"} 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* BACKGROUND SHAPE FOR ICON ONLY MODE */}
      {iconOnly && (
         <rect width="40" height="40" rx="10" className="fill-indigo-600" />
      )}

      {/* ICON ONLY MODE - SHOWS "H" + "S" stylized */}
      {iconOnly && (
        <text 
          x="20" 
          y="29" 
          fontSize="24" 
          fontWeight="900" 
          textAnchor="middle" 
          fill="white" 
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          H
        </text>
      )}

      {/* FULL WORDMARK "HUBSS" */}
      {!iconOnly && (
        <text 
          x="0" 
          y="30" 
          className={onDark ? "fill-white" : "fill-slate-900 dark:fill-white"}
          style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em' }}
        >
          <tspan fontWeight="800" fontSize="32">HUB</tspan>
          {/* The "SS" are italicized and slightly colored/different weight */}
          <tspan fontWeight="800" fontSize="32" style={{ fontStyle: 'italic' }} className={onDark ? "fill-indigo-300" : "fill-indigo-600"}>SS</tspan>
        </text>
      )}
    </svg>
  );
};

export default Logo;
