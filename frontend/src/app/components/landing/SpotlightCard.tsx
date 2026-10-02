"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Hover light that follows the cursor inside the card. The pointer position is written straight to
 * two CSS variables (no React re-render per mouse move); the gradient itself is plain Tailwind.
 */
export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      className={`group relative overflow-hidden rounded-2xl bg-lp-surface transition-transform duration-300 ease-out-strong hover:-translate-y-1 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(280px_circle_at_var(--x,50%)_var(--y,50%),var(--lp-tint-hover),transparent_70%)]"
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
