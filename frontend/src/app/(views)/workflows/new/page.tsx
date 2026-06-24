import { Suspense } from "react";
import WorkflowNewRedirect from "@/app/components/workflows/WorkflowNewRedirect";

export default function WorkflowNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <p className="text-sm text-slate-600">Creating your workflow…</p>
        </div>
      }
    >
      <WorkflowNewRedirect />
    </Suspense>
  );
}
