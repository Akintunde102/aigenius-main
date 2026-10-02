"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { AVG_COST_PER_REQUEST, BREAK_EVEN_REQUESTS, FLAT_PLAN_USD } from "./constants";

const MIN_REQUESTS = 50;
const MAX_REQUESTS = 6000;
const STEP = 50;
const DEFAULT_REQUESTS = 800;

export function MeterCalculator() {
  const sliderId = useId();
  const [requests, setRequests] = useState(DEFAULT_REQUESTS);

  const cost = requests * AVG_COST_PER_REQUEST;
  const spring = useSpring(cost, { stiffness: 140, damping: 22 });
  const label = useTransform(spring, (value) => `$${value.toFixed(2)}`);
  useEffect(() => {
    spring.set(cost);
  }, [cost, spring]);

  const barPercent = Math.min(100, (cost / FLAT_PLAN_USD) * 100);
  const message =
    cost < FLAT_PLAN_USD
      ? `You keep $${(FLAT_PLAN_USD - cost).toFixed(2)} that a flat plan would have taken.`
      : `Past about ${BREAK_EVEN_REQUESTS.toLocaleString("en-US")} requests a month, a flat plan costs less.`;

  return (
    <div className="rounded-3xl bg-lp-surface p-6 sm:p-10">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={sliderId} className="text-[15px] text-lp-muted">
          Requests per month
        </label>
        <p className="font-mono text-lg tabular-nums">{requests.toLocaleString("en-US")}</p>
      </div>
      <input
        id={sliderId}
        type="range"
        min={MIN_REQUESTS}
        max={MAX_REQUESTS}
        step={STEP}
        value={requests}
        onChange={(event) => setRequests(Number(event.target.value))}
        className="mt-4 w-full accent-lp-accent"
      />

      <div className="mt-10 space-y-6">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[15px] text-lp-muted">A flat subscription</p>
            <p className="font-mono text-2xl tabular-nums">${FLAT_PLAN_USD.toFixed(2)}</p>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-lp-tint">
            <div className="h-full w-full rounded-full bg-lp-muted" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[15px]">AIGenius wallet</p>
            <motion.p className="font-mono text-2xl tabular-nums text-lp-accent">{label}</motion.p>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-lp-tint">
            <motion.div
              className="h-full rounded-full bg-lp-accent"
              animate={{ width: `${barPercent}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />
          </div>
        </div>
      </div>

      <p className="mt-8 text-sm text-lp-muted" aria-live="polite">
        {message}
      </p>
      <p className="mt-2 text-xs text-lp-muted">
        Estimate at about ${AVG_COST_PER_REQUEST.toFixed(3)} per typical request. Real cost depends on the model.
      </p>
    </div>
  );
}
