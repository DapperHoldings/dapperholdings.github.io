import { FC } from "react";

interface ShieldLogoProps {
  className?: string;
}

export const ShieldLogo: FC<ShieldLogoProps> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield base */}
      <path
        d="M50 0 L95 20 V60 C95 90 50 115 50 115 C50 115 5 90 5 60 V20 L50 0Z"
        fill="currentColor"
        className="text-sky-500"
      />

      {/* Rotated butterfly silhouette inside shield */}
      <g transform="translate(50, 55) rotate(90) translate(-50, -55)">
        <path
          d="M50 35 
             C45 30, 35 25, 30 35 
             C25 45, 35 50, 50 55
             C65 50, 75 45, 70 35
             C65 25, 55 30, 50 35
             M50 55
             C35 60, 25 65, 30 75
             C35 85, 45 80, 50 75
             C55 80, 65 85, 70 75
             C75 65, 65 60, 50 55"
          fill="white"
          strokeWidth="1"
          stroke="currentColor"
          className="text-sky-100"
        />
      </g>
    </svg>
  );
};