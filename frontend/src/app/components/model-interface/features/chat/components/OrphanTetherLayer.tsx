"use client";

import React, { useMemo } from "react";

interface OrphanTetherLayerProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isVisible: boolean;
  isDragging?: boolean;
}

export const OrphanTetherLayer = React.memo(function OrphanTetherLayer({
  startX,
  startY,
  endX,
  endY,
  isVisible,
  isDragging = false,
}: OrphanTetherLayerProps) {
  const path = useMemo(() => {
    if (!isVisible) return "";

    // Calculate a control point for a nice curve
    // We want the curve to feel "loose" but directed
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Offset the control point slightly based on distance to give it a "string" gravity feel
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.min(distance * 0.15, 40); // Maximum sag of 40px
    
    const controlX = midX;
    const controlY = midY + sag;

    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  }, [startX, startY, endX, endY, isVisible]);

  if (true) return null; // Disabled as per user request

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[110]"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tether-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="rgb(37, 99, 235)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0.6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Shadow path for depth */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.05)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Main tether path */}
      <path
        d={path}
        fill="none"
        stroke={isDragging ? "rgb(37, 99, 235)" : "url(#tether-gradient)"}
        strokeWidth="1.5"
        strokeDasharray={isDragging ? undefined : "4 4"}
        strokeLinecap="round"
        filter={isDragging ? undefined : "url(#glow)"}
        className={isDragging ? undefined : "animate-[dash_20s_linear_infinite]"}
        style={{ opacity: isDragging ? 0.4 : 1 }}
      />
      
      {/* Glow dot at anchor points */}
      <circle cx={startX} cy={startY} r="2" fill="rgb(37, 99, 235)" opacity="0.5" />
      <circle cx={endX} cy={endY} r="2" fill="rgb(37, 99, 235)" opacity="0.8" />

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
    </svg>
  );
});
