import React from 'react';

export const ProgressRing = ({ percentage = 0, size = 90, strokeWidth = 8, subjectName }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Ensure percentage stays between 0 and 100
  const cleanPct = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (cleanPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-brand-glass rounded-2xl border border-white/5 shadow-md min-w-[110px]">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Track Ring */}
          <circle
            className="text-white/10"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Active Animated Ring */}
          <circle
            className="text-brand-emerald transition-all duration-700 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {/* Percentage Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(cleanPct)}%</span>
        </div>
      </div>
      {subjectName && (
        <span className="mt-3 text-xs font-medium text-white/80 text-center truncate max-w-[90px] block" title={subjectName}>
          {subjectName}
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
