import { Layers, Move, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  ensureUniqueStepId,
  friendlyToolName,
  resolveStepCanvasCoords,
  shouldAnimateConnectorPipeFlow,
  type WorkflowDraft,
  type WorkflowStepExecutionInfo,
  type WorkflowTool,
} from "./workflowsUtils";
import {
  getConnectorGeometry,
  getTailAppendConnectorGeometry,
  WORKFLOW_CANVAS_CARD_WIDTH,
} from "./workflowsCanvasGeometry";
import { workflowCanvasSurfaceStyle } from "./workflow-info";
import { GROUP_MOVE_HANDLE_SIZE } from "./workflowsStudio.constants";
import { HookConnector } from "./WorkflowHookConnector";
import { WorkflowStepChatCard } from "./WorkflowStepChatCard";

export type WorkflowsStudioCanvasProps = {
  viewportRef: React.RefObject<HTMLDivElement>;
  draft: WorkflowDraft;
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>;
  view: { x: number; y: number; scale: number };
  spacePanHeld: boolean;
  handleViewportPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleViewportPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleViewportPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleViewportMouseEnter: () => void;
  handleViewportMouseLeave: () => void;
  handleZoomStep: (direction: "in" | "out") => void;
  handleCanvasBackgroundPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleBundleCornerPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  handleCardPointerDown: (e: React.PointerEvent<HTMLDivElement>, localId: string) => void;
  stepCardElementsRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  worldSize: { width: number; height: number };
  allStepsTopLeft: { x: number; y: number } | null;
  isNarrow: boolean;
  connectorOrientation: "horizontal" | "vertical";
  stepCardHeights: Record<string, number>;
  tailAppendGeometry: ReturnType<typeof getTailAppendConnectorGeometry>;
  playState: "idle" | "running";
  stepExecutionByStepId: Record<string, WorkflowStepExecutionInfo>;
  addModalOpen: boolean;
  openAddModal: (atIndex: number) => void;
  toolLibrary: WorkflowTool[];
  resolveStepLabelForCard: (stepId: string) => string | undefined;
  setMenu: React.Dispatch<React.SetStateAction<{ stepId: string; x: number; y: number } | null>>;
  setConfigStepId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function WorkflowsStudioCanvas({
  viewportRef,
  draft,
  setDraft,
  view,
  spacePanHeld,
  handleViewportPointerDown,
  handleViewportPointerMove,
  handleViewportPointerUp,
  handleViewportMouseEnter,
  handleViewportMouseLeave,
  handleZoomStep,
  handleCanvasBackgroundPointerDown,
  handleBundleCornerPointerDown,
  handleCardPointerDown,
  stepCardElementsRef,
  worldSize,
  allStepsTopLeft,
  isNarrow,
  connectorOrientation,
  stepCardHeights,
  tailAppendGeometry,
  playState,
  stepExecutionByStepId,
  addModalOpen,
  openAddModal,
  toolLibrary,
  resolveStepLabelForCard,
  setMenu,
  setConfigStepId,
}: WorkflowsStudioCanvasProps) {
  return (
    <div
      ref={viewportRef}
      className="relative flex min-h-0 flex-1 touch-none overflow-hidden overscroll-none"
      data-workflow-canvas
      role="region"
      aria-label="Workflow canvas — drag empty space or hold Space and drag to pan, middle-click drag to pan, drag a step card to move it, Shift-drag a card or use the top-left move handle to move all steps, Ctrl+scroll to zoom"
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
      onMouseEnter={handleViewportMouseEnter}
      onMouseLeave={handleViewportMouseLeave}
    >
      {draft.steps.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <div className="pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-800/90 dark:bg-[#18191c]/95 dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => handleZoomStep("in")}
              title="Zoom in (+)"
              aria-label="Zoom in (+)"
            >
              <ZoomIn className="mx-auto h-4 w-4" aria-hidden />
              <span className="sr-only">Zoom in (+)</span>
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => handleZoomStep("out")}
              title="Zoom out (-)"
              aria-label="Zoom out (-)"
            >
              <ZoomOut className="mx-auto h-4 w-4" aria-hidden />
              <span className="sr-only">Zoom out (-)</span>
            </button>
          </div>
        </div>
      ) : null}

      {draft.steps.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] backdrop-blur-[2px] dark:border-slate-800/90 dark:bg-[#18191c]/90 dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:border-slate-700/80 dark:from-slate-800 dark:to-slate-900/80">
              <Layers className="h-7 w-7 text-slate-500 dark:text-slate-400" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Start your workflow</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Add tools to run in order. Pan the canvas, connect steps, and changes save automatically when you edit.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Tip: hold <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Space</kbd>{" "}
              and drag to move the board.
            </p>
            <Button
              type="button"
              className="mt-8 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-500"
              onClick={() => openAddModal(0)}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add first step
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`relative h-full min-h-[240px] w-full ${spacePanHeld ? "cursor-grab" : ""}`}
          data-workflow-viewport-root
        >
          <div
            className="absolute left-0 top-0 h-full w-full will-change-transform"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              data-workflow-canvas-bg
              className="absolute left-0 top-0 cursor-grab active:cursor-grabbing"
              style={{
                ...workflowCanvasSurfaceStyle(),
                width: worldSize.width,
                height: worldSize.height,
              }}
              onPointerDown={handleCanvasBackgroundPointerDown}
            />
            {!addModalOpen ? (
              <>
                <svg
                  key={draft.steps.map((step) => step.localId).join("|")}
                  className="pointer-events-none absolute left-0 top-0 z-[0]"
                  width={worldSize.width}
                  height={worldSize.height}
                  aria-hidden
                >
                  <defs>
                    <style>
                      {`
                        @keyframes workflow-pipe-flow {
                          to {
                            stroke-dashoffset: -40;
                          }
                        }
                        .workflow-pipe-flow-stroke {
                          animation: workflow-pipe-flow 1.05s linear infinite;
                        }
                        @media (prefers-reduced-motion: reduce) {
                          .workflow-pipe-flow-stroke {
                            animation: none;
                          }
                        }
                      `}
                    </style>
                  </defs>
                  {draft.steps.map((step, index) => {
                    const nextStep = draft.steps[index + 1];
                    if (!nextStep) return null;
                    const { pathD } = getConnectorGeometry(
                      step,
                      nextStep,
                      isNarrow,
                      index,
                      index + 1,
                      stepCardHeights,
                    );
                    const execUp = stepExecutionByStepId[step.stepId];
                    const execDown = stepExecutionByStepId[nextStep.stepId];
                    const flowActive = shouldAnimateConnectorPipeFlow(playState, execUp, execDown);
                    return (
                      <g key={`edge-${step.localId}-${nextStep.localId}`}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="rgba(58, 71, 87, 0.38)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {flowActive ? (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgb(34 197 94)"
                            strokeOpacity={0.92}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="10 14"
                            className="workflow-pipe-flow-stroke"
                          />
                        ) : null}
                      </g>
                    );
                  })}
                  {tailAppendGeometry ? (
                    <path
                      key="edge-tail-append"
                      d={tailAppendGeometry.pathD}
                      fill="none"
                      stroke="rgba(58, 71, 87, 0.28)"
                      strokeWidth={2}
                      strokeDasharray="6 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </svg>
                {draft.steps.map((step, index) => {
                  const nextStep = draft.steps[index + 1];
                  if (!nextStep) return null;
                  const { hookLeft, hookTop } = getConnectorGeometry(
                    step,
                    nextStep,
                    isNarrow,
                    index,
                    index + 1,
                    stepCardHeights,
                  );
                  return (
                    <div
                      key={`hook-${step.localId}-${nextStep.localId}`}
                      className="pointer-events-auto absolute z-[30]"
                      style={{ left: hookLeft, top: hookTop }}
                    >
                      <HookConnector orientation={connectorOrientation} onClick={() => openAddModal(index + 1)} />
                    </div>
                  );
                })}
                {tailAppendGeometry ? (
                  <div
                    className="pointer-events-auto absolute z-[30]"
                    style={{ left: tailAppendGeometry.hookLeft, top: tailAppendGeometry.hookTop }}
                  >
                    <HookConnector
                      orientation={connectorOrientation}
                      onClick={() => openAddModal(draft.steps.length)}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            {allStepsTopLeft && draft.steps.length >= 2 ? (
              <button
                type="button"
                className="pointer-events-auto absolute z-[25] flex cursor-grab touch-none items-center justify-center rounded-md border border-slate-400/70 bg-white/95 p-0 shadow-md active:cursor-grabbing"
                style={{
                  left: allStepsTopLeft.x,
                  top: allStepsTopLeft.y,
                  width: GROUP_MOVE_HANDLE_SIZE,
                  height: GROUP_MOVE_HANDLE_SIZE,
                }}
                onPointerDown={handleBundleCornerPointerDown}
                title="Move all steps"
                aria-label="Move all steps"
              >
                <Move className="h-3.5 w-3.5 text-slate-600" aria-hidden />
              </button>
            ) : null}
            {draft.steps.map((step, index) => {
              const canvasPos = resolveStepCanvasCoords(step, index);
              return (
                <div
                  key={step.localId}
                  ref={(node) => {
                    if (node) {
                      stepCardElementsRef.current.set(step.localId, node);
                    } else {
                      stepCardElementsRef.current.delete(step.localId);
                    }
                  }}
                  data-workflow-step-card
                  className="absolute z-[20] cursor-grab touch-none active:cursor-grabbing"
                  style={{
                    left: canvasPos.x,
                    top: canvasPos.y,
                    width: WORKFLOW_CANVAS_CARD_WIDTH,
                  }}
                  onPointerDown={(e) => handleCardPointerDown(e, step.localId)}
                  onPointerMove={handleViewportPointerMove}
                  onPointerUp={handleViewportPointerUp}
                  onPointerCancel={handleViewportPointerUp}
                >
                  <WorkflowStepChatCard
                    step={step}
                    index={index}
                    total={draft.steps.length}
                    tool={toolLibrary.find((t) => t.function.name === step.toolName)}
                    execution={stepExecutionByStepId[step.stepId]}
                    resolveStepLabel={resolveStepLabelForCard}
                    onOpenMenu={(e) => {
                      e.stopPropagation();
                      setMenu({ stepId: step.localId, x: e.clientX, y: e.clientY });
                    }}
                    onEditStep={() => {
                      setConfigStepId(step.localId);
                      setMenu(null);
                    }}
                    onUpdateLabel={(localId, label) => {
                      setDraft((d) => ({
                        ...d,
                        steps: d.steps.map((s) => {
                          if (s.localId !== localId) return s;
                          const others = d.steps.filter((x) => x.localId !== localId).map((x) => x.stepId);
                          return {
                            ...s,
                            label,
                            stepId: ensureUniqueStepId(label.trim() || friendlyToolName(s.toolName), others),
                          };
                        }),
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
