"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const SIZE_STYLES = {
  default: {
    box: "h-8 w-8",
    svg: "h-5 w-5",
    text: "text-xl",
  },
  lg: {
    box: "h-12 w-12",
    svg: "h-7 w-7",
    text: "text-3xl",
  },
  compact: {
    box: "h-7 w-7",
    svg: "h-4 w-4",
    text: "text-lg",
  },
} as const;

export type BrandLogoSize = keyof typeof SIZE_STYLES;

interface BrandLogoProps {
  className?: string;
  size?: BrandLogoSize;
  /** When true, render a non-interactive mark (e.g. modal chrome) instead of a home link. */
  asStatic?: boolean;
}

/**
 * Canonical site mark: gradient tile + chat icon + gradient wordmark (matches auth pages).
 */
export function BrandLogo({ className, size = "default", asStatic = false }: BrandLogoProps) {
  const s = SIZE_STYLES[size];

  const inner = (
    <>
      <div
        className={cn(
          s.box,
          "flex shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-md shadow-cyan-900/40 transition-transform group-hover:scale-105",
        )}
      >
        <svg
          className={cn(s.svg, "text-white")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <span
        className={cn(
          s.text,
          "font-bold tracking-tight text-transparent bg-clip-text bg-gradient-primary",
        )}
      >
        AIGenius
      </span>
    </>
  );
  if (asStatic) {
    return (
      <div className={cn("group inline-flex items-center gap-3", className)} role="img" aria-label="AIGenius">
        {inner}
      </div>
    );
  }

  return (
    <Link
      prefetch
      href="/"
      className={cn(
        "group inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e14]",
        className,
      )}
      aria-label="AIGenius homepage"
    >
      {inner}
    </Link>
  );
}
