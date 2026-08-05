"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type BentoGridProps = {
  children: React.ReactNode;
  className?: string;
};

/** Bento grid container — matches the reference layout (large cards top, small bottom). */
export const BentoGrid = ({ children, className }: BentoGridProps) => (
  <div
    className={cn(
      "grid w-full auto-rows-[10rem] grid-cols-1 gap-4 md:grid-cols-3",
      className
    )}
  >
    {children}
  </div>
);

type BentoCardProps = {
  className?: string;
  children: React.ReactNode;
  delay?: number;
};

/** Individual bento cell with subtle lift-in animation and hover elevation. */
export const BentoCard = ({ className, children, delay = 0 }: BentoCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-sm",
        "shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] transition-colors duration-300 hover:border-white/[0.14]",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
