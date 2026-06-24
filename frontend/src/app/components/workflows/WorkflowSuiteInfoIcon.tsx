"use client";

import React from "react";
import {
  Brain,
  FileText,
  Globe,
  Info,
  Link2,
  Linkedin,
  Mail,
  Search,
  StickyNote,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const WORKFLOW_SUITE_INFO_ICONS: Record<string, LucideIcon> = {
  Search,
  Globe,
  Link2,
  Mail,
  Linkedin,
  StickyNote,
  FileText,
  Brain,
  Wallet,
  Info,
};

type WorkflowSuiteInfoIconProps = {
  /** Lucide icon name from backend `ToolSuiteDefinition.workflowInfoIcon`. */
  name?: string | null;
  className?: string;
};

/**
 * Renders the suite-specific “about this tool” icon from the tools API (`workflowInfoIcon`).
 */
export function WorkflowSuiteInfoIcon({ name, className }: WorkflowSuiteInfoIconProps) {
  const Icon = (name && WORKFLOW_SUITE_INFO_ICONS[name]) || Info;
  return <Icon className={className} aria-hidden />;
}
