import React from 'react';

/**
 * GaugeChart — Score chauffeur en arc de cercle coloré
 *
 * Usage dans ChauffeurDashboard :
 *   import GaugeChart from '../components/GaugeChart';
 *   <GaugeChart score={4.2} max={5} label="Score global" />
 */

const GaugeChart = ({ score = 0, max = 5, label = 'Score', size = 160 }) => {
  const percent = Math.min(1, score / max);
  const radius = 54;
  const circumference = Math.PI * radius; // demi-cercle
  const strokeDash = circumference * percent;

  // Couleur dynamique
  const color =
    percent >= 0.8 ? '#2ED573' :   // vert
    percent >= 0.5 ? '#FFA502' :   // orange
    '#FF4757';                      // rouge

  const scoreFormatted = Number(score).toFixed(1);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Track */}
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius * (size/120)} ${radius * (size/120)} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke="#E4E7EF"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius * (size/120)} ${radius * (size/120)} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${circumference * (size / 120) * percent} ${circumference * (size / 120)}`}
          style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
        />
        {/* Score text */}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700" fontFamily="Poppins, Inter, sans-serif">
          {scoreFormatted}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill="#9CA3AF" fontSize={size * 0.09}>
          / {max}
        </text>
      </svg>
      <p className="text-sm font-medium text-[var(--color-text-secondary)] -mt-2">{label}</p>
    </div>
  );
};

export default GaugeChart;
