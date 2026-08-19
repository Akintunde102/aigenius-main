import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { WorkflowStepMenuState } from "./useWorkflowsStudioStepMenu";

export function WorkflowsStudioStepMenuPanel({
  menu,
  menuRef,
  setMenu,
  setConfigStepId,
  moveStep,
  removeStep,
}: {
  menu: WorkflowStepMenuState;
  menuRef: React.RefObject<HTMLDivElement>;
  setMenu: (value: WorkflowStepMenuState | null) => void;
  setConfigStepId: (id: string) => void;
  moveStep: (stepLocalId: string, direction: "up" | "down") => void;
  removeStep: (stepLocalId: string) => void;
}) {
  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-[#18191c] dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={() => {
          setConfigStepId(menu.stepId);
          setMenu(null);
        }}
      >
        Edit…
      </button>
      <button
        type="button"
        className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={() => {
          moveStep(menu.stepId, "up");
          setMenu(null);
        }}
      >
        <ChevronUp className="mr-2 inline h-4 w-4" />
        Move up
      </button>
      <button
        type="button"
        className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={() => {
          moveStep(menu.stepId, "down");
          setMenu(null);
        }}
      >
        <ChevronDown className="mr-2 inline h-4 w-4" />
        Move down
      </button>
      <button
        type="button"
        className="flex w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
        onClick={() => {
          removeStep(menu.stepId);
          setMenu(null);
        }}
      >
        Remove step
      </button>
    </div>
  );
}
