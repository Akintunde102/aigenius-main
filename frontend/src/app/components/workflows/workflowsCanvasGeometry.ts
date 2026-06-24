import {
  computeInsertCanvasPosition,
  resolveStepCanvasCoords,
  type WorkflowStepDraft,
} from "./workflowsUtils";

export const WORKFLOW_CANVAS_CARD_WIDTH = 320;
export const WORKFLOW_CANVAS_CARD_FALLBACK_HEIGHT = 112;
export const WORKFLOW_CANVAS_HOOK_WIDTH = 56;
export const WORKFLOW_CANVAS_HOOK_HEIGHT = 40;

type CardHeightsByLocalId = Record<string, number>;

function getStepCardHeight(step: WorkflowStepDraft, cardHeightsByLocalId: CardHeightsByLocalId) {
  const measured = cardHeightsByLocalId[step.localId];
  return typeof measured === "number" && Number.isFinite(measured) && measured > 0
    ? measured
    : WORKFLOW_CANVAS_CARD_FALLBACK_HEIGHT;
}

function cubicBezierPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: u3 * p0[0] + 3 * u2 * t * p1[0] + 3 * u * t2 * p2[0] + t3 * p3[0],
    y: u3 * p0[1] + 3 * u2 * t * p1[1] + 3 * u * t2 * p2[1] + t3 * p3[1],
  };
}

export function getConnectorGeometry(
  a: WorkflowStepDraft,
  b: WorkflowStepDraft,
  narrow: boolean,
  indexA: number,
  indexB: number,
  cardHeightsByLocalId: CardHeightsByLocalId = {},
): { pathD: string; hookLeft: number; hookTop: number } {
  const pa = resolveStepCanvasCoords(a, indexA);
  const pb = resolveStepCanvasCoords(b, indexB);
  const ax = pa.x;
  const ay = pa.y;
  const bx = pb.x;
  const by = pb.y;
  const w = WORKFLOW_CANVAS_CARD_WIDTH;
  const ah = getStepCardHeight(a, cardHeightsByLocalId);
  const bh = getStepCardHeight(b, cardHeightsByLocalId);

  const sx = narrow ? ax + w / 2 : ax + w;
  const sy = narrow ? ay + ah : ay + ah / 2;
  const ex = narrow ? bx + w / 2 : bx;
  const ey = narrow ? by : by + bh / 2;

  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    return {
      pathD: `M ${sx} ${sy} L ${ex} ${ey}`,
      hookLeft: (sx + ex) / 2 - WORKFLOW_CANVAS_HOOK_WIDTH / 2,
      hookTop: (sy + ey) / 2 - WORKFLOW_CANVAS_HOOK_HEIGHT / 2,
    };
  }

  const c = Math.min(narrow ? 130 : 160, Math.max(48, dist * 0.4));
  let p1: [number, number];
  let p2: [number, number];

  if (narrow) {
    if (Math.abs(dx) < 10) {
      const sdy = Math.sign(dy) || 1;
      p1 = [sx, sy + sdy * c];
      p2 = [ex, ey - sdy * c];
    } else {
      const sdx = Math.sign(dx) || 1;
      p1 = [sx + sdx * c, sy];
      p2 = [ex - sdx * c, ey];
    }
  } else if (Math.abs(dx) < 10) {
    const sdy = Math.sign(dy) || 1;
    p1 = [sx, sy + sdy * c];
    p2 = [ex, ey - sdy * c];
  } else {
    const sdx = Math.sign(dx) || 1;
    p1 = [sx + sdx * c, sy];
    p2 = [ex - sdx * c, ey];
  }

  const p0: [number, number] = [sx, sy];
  const p3: [number, number] = [ex, ey];
  const pathD = `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;
  const mid = cubicBezierPoint(p0, p1, p2, p3, 0.5);
  return {
    pathD,
    hookLeft: mid.x - WORKFLOW_CANVAS_HOOK_WIDTH / 2,
    hookTop: mid.y - WORKFLOW_CANVAS_HOOK_HEIGHT / 2,
  };
}

export function getTailAppendConnectorGeometry(
  steps: WorkflowStepDraft[],
  narrow: boolean,
  cardHeightsByLocalId: CardHeightsByLocalId = {},
): { pathD: string; hookLeft: number; hookTop: number } | null {
  if (steps.length === 0) return null;
  const lastIdx = steps.length - 1;
  const last = steps[lastIdx];
  const pos = computeInsertCanvasPosition(steps, steps.length);
  const phantom: WorkflowStepDraft = {
    localId: "__workflow_tail_phantom__",
    label: "",
    stepId: "__workflow_tail_phantom__",
    toolName: "",
    args: {},
    canvasX: pos.x,
    canvasY: pos.y,
  };
  return getConnectorGeometry(last, phantom, narrow, lastIdx, steps.length, cardHeightsByLocalId);
}

export function getWorkflowWorldBounds(
  steps: WorkflowStepDraft[],
  cardHeightsByLocalId: CardHeightsByLocalId = {},
) {
  if (steps.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  steps.forEach((step, index) => {
    const { x, y } = resolveStepCanvasCoords(step, index);
    const height = getStepCardHeight(step, cardHeightsByLocalId);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + WORKFLOW_CANVAS_CARD_WIDTH);
    maxY = Math.max(maxY, y + height);
  });

  return { minX, minY, maxX, maxY };
}
