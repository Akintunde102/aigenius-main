import { FEATURE_FLAGS } from "@/lib/config/features";

type AppRouterLike = { prefetch: (href: string) => void };

function runWhenIdle(fn: () => void): void {
  if (typeof window === "undefined") {
    return;
  }
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(fn, { timeout: 4000 });
  } else {
    window.setTimeout(fn, 1);
  }
}

let workflowStudioImportStarted = false;

/** Warms workflow dashboard routes and the heavy studio chunk after list mount. */
export function scheduleWorkflowShellPrefetch(
  router: AppRouterLike,
  workflowIds: string[] = [],
): void {
  if (!FEATURE_FLAGS.WORKFLOWS) {
    return;
  }
  runWhenIdle(() => {
    const routes = ["/notifications", "/schedules"];
    for (const id of workflowIds.slice(0, 8)) {
      routes.push(`/workflow/${id}`, `/workflow/${id}/executions`);
    }
    for (const href of routes) {
      try {
        router.prefetch(href);
      } catch {
        /* noop */
      }
    }
    if (workflowStudioImportStarted) {
      return;
    }
    workflowStudioImportStarted = true;
    void import("@/app/components/workflows/WorkflowsStudio");
    void import("@/app/components/schedule-notifications/ScheduleNotificationsView");
    void import("@/app/components/workflows/SchedulesListView");
  });
}
