import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clampMenuToViewport } from "./workflowsStudio.utils";

export type WorkflowStepMenuState = { stepId: string; x: number; y: number };

export function useWorkflowsStudioStepMenu() {
  const [menu, setMenu] = useState<WorkflowStepMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu) return;
    const apply = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenu((m) => {
        if (!m) return m;
        const { x, y } = clampMenuToViewport(
          m.x,
          m.y,
          rect.width,
          rect.height,
          window.innerWidth,
          window.innerHeight,
        );
        if (x === m.x && y === m.y) return m;
        return { ...m, x, y };
      });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [menu]);

  return { menu, setMenu, menuRef };
}
