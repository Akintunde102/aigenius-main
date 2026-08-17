import { useMemo } from "react";
import { JsonOrPlainTextBlock } from "@/app/components/JsonSyntaxBlock";
import {
  formatWorkflowBilledUsd,
  formatWorkflowToolOutputForDisplay,
  formatWorkflowWalletBalance,
  type WorkflowStepExecutionInfo,
} from "./workflowsUtils";

/** Last run output / error under the args panel (scrollable; avoids runaway card height). */
export function WorkflowStepExecutionOutput({ execution }: { execution: WorkflowStepExecutionInfo }) {
  const err = execution.error?.trim() ?? "";
  const result = execution.result?.trim() ?? "";
  const showFailed = execution.status === "failed";
  const showOutput = execution.status === "completed" && result.length > 0;
  const billedUsd = formatWorkflowBilledUsd(execution.billedUsd);
  const walletAfter = formatWorkflowWalletBalance(execution.walletAfter);
  const showMeta = billedUsd !== null || walletAfter !== null;

  const displayErr = useMemo(() => (err ? formatWorkflowToolOutputForDisplay(err) : ""), [err]);
  const displayResult = useMemo(() => formatWorkflowToolOutputForDisplay(result), [result]);

  if (!showFailed && !showOutput && !showMeta) {
    return null;
  }

  return (
    <div
      data-no-workflow-drag
      className="border-t border-slate-200/70 dark:border-slate-800/80"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showMeta ? (
        <div className="border-b border-slate-200/60 bg-slate-50/85 px-2.5 py-2 dark:border-slate-800/80 dark:bg-[#141518]">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
            {billedUsd ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Cost {billedUsd}
              </span>
            ) : null}
            {walletAfter ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Wallet {walletAfter}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {showFailed ? (
        <div className="bg-rose-50/90 px-2.5 py-2 dark:bg-rose-950/80">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">Error</p>
          <div className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto">
            {err ? (
              <JsonOrPlainTextBlock
                text={displayErr}
                preClassName="max-h-none border-rose-200/80 bg-white/95 text-rose-950 dark:border-rose-900/60 dark:bg-[#18191c] dark:text-rose-200"
                codeClassName="text-[10px] text-rose-950 dark:text-rose-200"
              />
            ) : (
              <p className="text-[10px] text-rose-950 dark:text-rose-200">No error message was returned.</p>
            )}
          </div>
        </div>
      ) : null}
      {showOutput ? (
        <div className="border-t border-slate-200/60 bg-slate-50/90 px-2.5 py-2 dark:border-slate-800/80 dark:bg-[#141518]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Output</p>
          <div className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto">
            <JsonOrPlainTextBlock
              text={displayResult}
              preClassName="max-h-none border-slate-200/80 bg-white/95 text-slate-800 dark:border-slate-800/90 dark:bg-[#18191c] dark:text-slate-200"
              codeClassName="text-[10px] text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
