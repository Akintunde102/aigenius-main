"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Ambient background for the landing page: soft animated gradient + grid,
 * matching the dark, premium aesthetic of the reference design.
 */
export function LandingAmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[#05070d]" />

      {/* Aurora-like animated gradient blobs (very subtle) */}
      <motion.div
        className="absolute -top-1/4 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(8,145,178,0.55), rgba(16,185,129,0.25) 55%, transparent 75%)",
        }}
        animate={
          reduce
            ? undefined
            : { x: ["-50%", "-45%", "-50%"], y: ["0%", "4%", "0%"] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 top-1/3 h-[26rem] w-[26rem] rounded-full opacity-[0.12] blur-[110px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.45), transparent 70%)",
        }}
        animate={reduce ? undefined : { y: ["0%", "-6%", "0%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay (like reference) */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 55% at 50% 28%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 55% at 50% 28%, black 30%, transparent 75%)",
        }}
      />

      {/* Top fade into page background */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#05070d] to-transparent" />
    </div>
  );
}
