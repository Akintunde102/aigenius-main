"use client";

import axios from "axios";
import { memo, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  History,
  Loader2,
  Play,
  Plug,
  Coins,
  RotateCw,
  SkipForward,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { refreshAccessToken } from "@/lib/api/auth-client";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { Button } from "@/app/components/ui/button";
import IntegrationsModal from "@/app/components/ChatHistorySidebar/IntegrationsModal";
import WalletModal from "@/app/components/ChatHistorySidebar/WalletModal";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { useWalletSocket } from "@/lib/hooks/useWalletSocket";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  categorizeTool,
  formatWorkflowBilledUsd,
  formatWorkflowWalletBalance,
  formatWorkflowToolOutputForDisplay,
  friendlyToolName,
  summarizeWorkflowStepArgsForDisplay,
  workflowStepRunStatusLabel,
} from "./workflowsUtils";
import {
  fetchWorkflow,
  fetchWorkflowRun,
  fetchWorkflowRuns,
  deleteWorkflowRun,
  deleteWorkflowRuns,
  WorkflowsApiError,
  type WorkflowRecord,
  type WorkflowRunDetailResponse,
  type WorkflowRunListItem,
} from "./workflowsApi";
import {
  getConnectorGeometry,
  getTailAppendConnectorGeometry,
} from "./workflowsCanvasGeometry";
import {
  WorkflowValuesPanel,
  workflowCanvasSurfaceStyle,
  workflowShellBgStyle,
} from "./workflow-info";
import type { WorkflowStepDraft } from "./workflowsUtils";
import {
  HistoryTimelinePanel,
  WorkflowSnapshotCanvas,
  formatDateTime,
  formatTriggerLabel,
  isAuthProblem,
  isTerminalWorkflowRun,
  statusTone,
} from "./WorkflowExecutionsViewPanels";

import { WorkflowExecutionsViewMain } from "./WorkflowExecutionsViewMain";

export default function WorkflowExecutionsView() {
  return <WorkflowExecutionsViewMain />;
}
