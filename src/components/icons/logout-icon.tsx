import React from 'react';

interface LogoutIconProps {
  className?: string;
}

export function LogoutIcon({ className }: LogoutIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 78 74"
      className={className}
    >
      <g>
        <line
          x1="44"
          y1="30"
          x2="62.2"
          y2="30"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeMiterlimit="10"
          fill="none"
        />
        <polygon
          points="59.8 11.8 59.8 48.2 78 30 59.8 11.8"
          fill="currentColor"
        />
      </g>
      <g>
        <path
          d="M2.8,2.5h47.2c1.4,0,1.4,1,1.4,2v12"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeMiterlimit="10"
          fill="none"
        />
        <rect x=".5" y="0" width="5" height="5" fill="currentColor" />
      </g>
      <path
        d="M2.5,57.5s45.9.5,47.4.5,1.6-.7,1.6-1.6v-12.9"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeMiterlimit="10"
        fill="none"
      />
      <polygon points="32 74 0 60 0 0 32 14 32 74" fill="currentColor" />
    </svg>
  );
}
