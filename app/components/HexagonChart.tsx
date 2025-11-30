"use client";

import React, { useMemo } from 'react';

interface HexagonChartProps {
  values: number[];
  labels: string[];
  max: number;
  size: number;
}

const HexagonChart: React.FC<HexagonChartProps> = ({ values, labels, max, size }) => {
  const center = size / 2;
  const radius = size * 0.35;

  const points = useMemo(() => {
    return values.map((value, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = Math.max(0, (value / max) * radius);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [values, max, radius, center]);

  const gridLines = useMemo(() => {
    const levels = 4;
    return Array.from({ length: levels }).map((_, levelIndex) => {
      const r = (radius / levels) * (levelIndex + 1);
      return labels.map((_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(' ');
    });
  }, [labels, radius, center]);

  const axisAndLabels = useMemo(() => {
    return labels.map((label, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x1 = center;
      const y1 = center;
      const x2 = center + radius * Math.cos(angle);
      const y2 = center + radius * Math.sin(angle);
      const labelX = center + (radius + 15) * Math.cos(angle);
      const labelY = center + (radius + 15) * Math.sin(angle);
      return { x1, y1, x2, y2, labelX, labelY, label };
    });
  }, [labels, radius, center]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLines.map((line, i) => <polygon key={i} points={line} fill="none" stroke="#e5e7eb" strokeWidth="1" />)}
      {axisAndLabels.map((axis, i) => (
        <g key={i}>
          <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#e5e7eb" strokeWidth="1" />
          <text x={axis.labelX} y={axis.labelY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#4b5563">{axis.label}</text>
        </g>
      ))}
      <polygon points={points} fill="rgba(79, 70, 229, 0.2)" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  );
};

export default HexagonChart;