import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveStepCanvasCoords,
  type WorkflowDraft,
  type WorkflowStepDraft,
} from "./workflowsUtils";
import { CANVAS_MAX_SCALE, CANVAS_MIN_SCALE, CARD_DRAG_SLOP_PX } from "./workflowsStudio.constants";
import { clamp } from "./workflowsStudio.utils";

export function useWorkflowsStudioCanvas({
  loading,
  authBlocked,
  loadError,
  draftSteps,
  setDraft,
}: {
  loading: boolean;
  authBlocked: boolean;
  loadError: string | null;
  draftSteps: WorkflowStepDraft[];
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>;
}) {
  /** Pan/zoom view transform (screen space: x,y are top-left of scaled world). */
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.88 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasPanRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const cardDragRef = useRef<{
    pointerId: number;
    localId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    activated: boolean;
  } | null>(null);
  const cardDragSlopCleanupRef = useRef<(() => void) | null>(null);
  const groupDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const spacePressedRef = useRef(false);
  const canvasViewportHoveredRef = useRef(false);
  const [spacePanHeld, setSpacePanHeld] = useState(false);

  useEffect(() => {
    const blocksSpacePan = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      Boolean(el.closest("input, textarea, [contenteditable], select, button, a[href], [role='dialog']"));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (!canvasViewportHoveredRef.current) return;
      if (blocksSpacePan(e.target)) return;
      e.preventDefault();
      spacePressedRef.current = true;
      setSpacePanHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        setSpacePanHeld(false);
      }
    };
    const onBlur = () => {
      spacePressedRef.current = false;
      setSpacePanHeld(false);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (loading || authBlocked || loadError) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY;
        const zoomFactor = 1 + delta * 0.001;
        setView((v) => {
          const nextScale = clamp(v.scale * zoomFactor, CANVAS_MIN_SCALE, CANVAS_MAX_SCALE);
          const worldX = (mx - v.x) / v.scale;
          const worldY = (my - v.y) / v.scale;
          return {
            scale: nextScale,
            x: mx - worldX * nextScale,
            y: my - worldY * nextScale,
          };
        });
      } else {
        setView((v) => ({
          ...v,
          x: v.x - e.deltaX,
          y: v.y - e.deltaY,
        }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [loading, authBlocked, loadError]);

  const startCanvasPan = useCallback((e: React.PointerEvent, captureTarget: HTMLElement) => {
    const v = viewRef.current;
    canvasPanRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: v.x,
      originY: v.y,
    };
    captureTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleCanvasBackgroundPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      startCanvasPan(e, vp);
    },
    [startCanvasPan],
  );

  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 1) return;
      e.preventDefault();
      startCanvasPan(e, e.currentTarget);
    },
    [startCanvasPan],
  );

  const handleViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = canvasPanRef.current;
    if (p && p.pointerId === e.pointerId) {
      setView({
        ...viewRef.current,
        x: p.originX + (e.clientX - p.startClientX),
        y: p.originY + (e.clientY - p.startClientY),
      });
      return;
    }
    const cd = cardDragRef.current;
    if (cd && cd.pointerId === e.pointerId) {
      if (!cd.activated) return;
      const scale = viewRef.current.scale;
      const dx = (e.clientX - cd.startClientX) / scale;
      const dy = (e.clientY - cd.startClientY) / scale;
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.localId === cd.localId ? { ...s, canvasX: cd.originX + dx, canvasY: cd.originY + dy } : s,
        ),
      }));
      return;
    }
    const gd = groupDragRef.current;
    if (gd && gd.pointerId === e.pointerId) {
      const scale = viewRef.current.scale;
      const dx = (e.clientX - gd.startClientX) / scale;
      const dy = (e.clientY - gd.startClientY) / scale;
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => {
          const o = gd.origins.get(s.localId);
          if (!o) return s;
          return { ...s, canvasX: o.x + dx, canvasY: o.y + dy };
        }),
      }));
    }
  }, [setDraft]);

  const clearCardDragSlopListeners = useCallback(() => {
    cardDragSlopCleanupRef.current?.();
    cardDragSlopCleanupRef.current = null;
  }, []);

  useEffect(() => () => clearCardDragSlopListeners(), [clearCardDragSlopListeners]);

  const handleViewportPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (canvasPanRef.current?.pointerId === e.pointerId) {
        canvasPanRef.current = null;
      }
      if (cardDragRef.current?.pointerId === e.pointerId) {
        clearCardDragSlopListeners();
        cardDragRef.current = null;
      }
      if (groupDragRef.current?.pointerId === e.pointerId) {
        groupDragRef.current = null;
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [clearCardDragSlopListeners],
  );

  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, localId: string) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-no-workflow-drag]")) return;

      if (spacePressedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const vp = viewportRef.current;
        if (!vp) return;
        startCanvasPan(e, vp);
        return;
      }

      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        clearCardDragSlopListeners();
        const origins = new Map<string, { x: number; y: number }>();
        draftSteps.forEach((s, i) => {
          const r = resolveStepCanvasCoords(s, i);
          origins.set(s.localId, { x: r.x, y: r.y });
        });
        groupDragRef.current = {
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origins,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      e.stopPropagation();
      const stepIndex = draftSteps.findIndex((s) => s.localId === localId);
      const step = stepIndex >= 0 ? draftSteps[stepIndex] : undefined;
      if (!step) return;

      clearCardDragSlopListeners();

      const captureEl = e.currentTarget;
      const pointerId = e.pointerId;
      const origin = resolveStepCanvasCoords(step, stepIndex);
      cardDragRef.current = {
        pointerId,
        localId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: origin.x,
        originY: origin.y,
        activated: false,
      };

      const onWindowMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const cd = cardDragRef.current;
        if (!cd || cd.pointerId !== pointerId || cd.activated) return;
        const dist = Math.hypot(ev.clientX - cd.startClientX, ev.clientY - cd.startClientY);
        if (dist < CARD_DRAG_SLOP_PX) return;
        cd.activated = true;
        try {
          captureEl.setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        clearCardDragSlopListeners();
        ev.preventDefault();
      };
      const onWindowUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const cd = cardDragRef.current;
        if (!cd || cd.pointerId !== pointerId) return;
        clearCardDragSlopListeners();
        if (!cd.activated) {
          cardDragRef.current = null;
        }
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", onWindowMove);
        window.removeEventListener("pointerup", onWindowUp);
        window.removeEventListener("pointercancel", onWindowUp);
      };
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
      cardDragSlopCleanupRef.current = cleanup;
    },
    [draftSteps, startCanvasPan, clearCardDragSlopListeners],
  );

  /** Move all steps together (same as Shift-drag on a card); handle sits at the bbox top-left. */
  const handleBundleCornerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const vp = viewportRef.current;
      if (!vp) return;

      if (spacePressedRef.current) {
        startCanvasPan(e, vp);
        return;
      }

      const origins = new Map<string, { x: number; y: number }>();
      draftSteps.forEach((s, i) => {
        const r = resolveStepCanvasCoords(s, i);
        origins.set(s.localId, { x: r.x, y: r.y });
      });
      groupDragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origins,
      };
      vp.setPointerCapture(e.pointerId);
    },
    [draftSteps, startCanvasPan],
  );

  const handleZoomStep = useCallback((direction: "in" | "out") => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = direction === "in" ? 1.12 : 1 / 1.12;
    setView((v) => {
      const nextScale = clamp(v.scale * factor, CANVAS_MIN_SCALE, CANVAS_MAX_SCALE);
      const worldX = (mx - v.x) / v.scale;
      const worldY = (my - v.y) / v.scale;
      return {
        scale: nextScale,
        x: mx - worldX * nextScale,
        y: my - worldY * nextScale,
      };
    });
  }, []);

  const handleViewportMouseEnter = useCallback(() => {
    canvasViewportHoveredRef.current = true;
  }, []);

  const handleViewportMouseLeave = useCallback(() => {
    canvasViewportHoveredRef.current = false;
    spacePressedRef.current = false;
    setSpacePanHeld(false);
  }, []);

  return {
    view,
    setView,
    viewRef,
    viewportRef,
    spacePanHeld,
    handleCanvasBackgroundPointerDown,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
    handleCardPointerDown,
    handleBundleCornerPointerDown,
    handleZoomStep,
    handleViewportMouseEnter,
    handleViewportMouseLeave,
  };
}
