"use client";

import React, { useState } from "react";
import { FiTool } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { WorkflowTool } from "./workflowsUtils";

type WorkflowToolIconProps = {
  tool: WorkflowTool | undefined;
  /** Outer box (e.g. h-7 w-7 rounded-md) */
  className?: string;
  /** Applied to the fallback glyph container when no image */
  fallbackClassName?: string;
};

/**
 * Renders a tool icon from `iconUrl` when provided, otherwise the generic tool glyph.
 */
export function WorkflowToolIcon({ tool, className, fallbackClassName }: WorkflowToolIconProps) {
  const [broken, setBroken] = useState(false);
  const url = tool?.iconUrl?.trim();

  if (url && !broken) {
    return (
      <span
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-white", className)}
      >
        <img
          src={url}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-0.5"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center justify-center", className, fallbackClassName)}>
      <FiTool className="h-3.5 w-3.5" aria-hidden />
    </div>
  );
}
