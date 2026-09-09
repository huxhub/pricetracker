import React from 'react';

interface FlaticonMenuIconProps {
  className?: string;
}

/**
 * Authentic Flaticon Rounded Hamburger Menu Icon
 * Vector from Flaticon (Freepik / UIcons Regular Rounded)
 */
export const FlaticonMenuIcon: React.FC<FlaticonMenuIconProps> = ({ className = 'w-5 h-5' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M492 236H20c-11.046 0-20 8.954-20 20s8.954 20 20 20h472c11.046 0 20-8.954 20-20s-8.954-20-20-20z" />
      <path d="M492 76H20C8.954 76 0 84.954 0 96s8.954 20 20 20h472c11.046 0 20-8.954 20-20s-8.954-20-20-20z" />
      <path d="M492 396H20c-11.046 0-20 8.954-20 20s8.954 20 20 20h472c11.046 0 20-8.954 20-20s-8.954-20-20-20z" />
    </svg>
  );
};

export default FlaticonMenuIcon;
