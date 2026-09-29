"use client";

import React, { useState, useEffect, useRef } from "react";

const CAPABILITIES = [
  "Draft winning client proposals in seconds",
  "Build a website directly on your PC",
  "Update excel sheets without knowing excel",
  "Organize project files & folders seamlessly",
  "Conduct in-depth research stresslessly",
  "Turn messy meeting notes into clear actions",
  "Write & debug clean code without the headache",
  "Summarize 100-page PDF reports in seconds",
  "Automate repetitive daily desktop workflows",
  "Analyze complex data using plain English",
];

type AnimPhase = "idle" | "exit" | "enter";

export default function CartoonCapabilityBanner() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % CAPABILITIES.length);
      }, 4000);
      return () => clearInterval(interval);
    }

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    const runCycle = () => {
      clearTimers();

      // Dwell period before graceful slide-out
      const exitTimer = setTimeout(() => {
        setPhase("exit");

        // After exit transition completes (~380ms), switch phrase and prepare enter state
        const switchTimer = setTimeout(() => {
          setIndex((prev) => (prev + 1) % CAPABILITIES.length);
          setPhase("enter");

          // Next frame: smoothly glide up to idle
          const enterTimer = setTimeout(() => {
            setPhase("idle");
            runCycle();
          }, 40);
          timersRef.current.push(enterTimer);
        }, 380);
        timersRef.current.push(switchTimer);
      }, 3800);
      timersRef.current.push(exitTimer);
    };

    runCycle();

    return () => clearTimers();
  }, []);

  const current = CAPABILITIES[index];

  return (
    <div className="usage-banner-wrapper cartoon-banner-wrapper" aria-live="polite">
      <div className={`usage-banner-header usage-phase-${phase}`}>
        {current}
      </div>
    </div>
  );
}
