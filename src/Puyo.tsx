import { createContext, useContext, useState } from 'react';
import { COLORS, type Color } from './engine';
export const AssetContext = createContext<Record<number, string>>({});
const fills = ['none', '#f0787b', '#96d164', '#6da8f0', '#f3cb53', '#b39ae9', '#c0c8cd'];
const darks = ['none', '#d35163', '#62a849', '#467cce', '#d5a433', '#8e6bbe', '#8c9fa7'];
export default function Puyo({
  color,
  ghost = false,
  tiny = false,
}: {
  color: Color;
  ghost?: boolean;
  tiny?: boolean;
}) {
  const assets = useContext(AssetContext);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!color) return null;
  if (assets[color] && failedUrl !== assets[color])
    return (
      <img
        onError={() => setFailedUrl(assets[color])}
        className={`puyo ${ghost ? 'ghost' : ''}`}
        src={assets[color]}
        alt={COLORS[color]}
        draggable={false}
      />
    );
  return (
    <svg
      className={`puyo ${ghost ? 'ghost' : ''}`}
      viewBox="0 0 48 48"
      role="img"
      aria-label={COLORS[color]}
    >
      <path
        d={
          color === 6
            ? 'M24 4 41 14 41 34 24 44 7 34 7 14Z'
            : 'M24 5C12 5 5 15 4 28C3 39 11 44 24 44S45 39 44 28C43 15 36 5 24 5Z'
        }
        fill={fills[color]}
        stroke={darks[color]}
        strokeWidth="2"
      />
      <path
        d="M10 29c1 9 9 12 17 11"
        fill="none"
        stroke={darks[color]}
        strokeWidth="3"
        opacity=".4"
        strokeLinecap="round"
      />
      {!tiny && (
        <ellipse
          cx="16"
          cy="12"
          rx="6"
          ry="3"
          transform="rotate(-26 16 12)"
          fill="white"
          opacity=".5"
        />
      )}
      {color === 6 ? (
        <>
          <circle cx="17" cy="25" r="3" fill="#657681" />
          <circle cx="31" cy="25" r="3" fill="#657681" />
        </>
      ) : (
        <>
          <ellipse cx="18" cy="27" rx="6" ry="8" fill="#fff" />
          <ellipse cx="31" cy="26" rx="6" ry="8" fill="#fff" />
          <ellipse cx="20" cy="28" rx="2.7" ry="4.4" fill="#253d44" />
          <ellipse cx="33" cy="27" rx="2.7" ry="4.4" fill="#253d44" />
        </>
      )}
    </svg>
  );
}
