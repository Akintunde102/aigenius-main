import {
  getConnectorGeometry,
  getTailAppendConnectorGeometry,
  getWorkflowWorldBounds,
} from "./workflowsCanvasGeometry";
import type { WorkflowStepDraft } from "./workflowsUtils";

function step(localId: string, x: number, y: number): WorkflowStepDraft {
  return {
    localId,
    label: localId,
    stepId: localId,
    toolName: "gmail_list_messages",
    args: {},
    canvasX: x,
    canvasY: y,
  };
}

describe("workflowsCanvasGeometry", () => {
  it("moves connector anchors when the source card grows taller", () => {
    const a = step("a", 2400, 2400);
    const b = step("b", 2760, 2400);

    const base = getConnectorGeometry(a, b, false, 0, 1, {});
    const tall = getConnectorGeometry(a, b, false, 0, 1, { a: 280 });

    expect(tall.pathD).not.toBe(base.pathD);
    expect(tall.hookTop).toBeGreaterThan(base.hookTop);
  });

  it("uses measured card heights when computing world bounds", () => {
    const bounds = getWorkflowWorldBounds(
      [step("a", 2400, 2400), step("b", 2760, 2500)],
      { b: 260 },
    );

    expect(bounds).toEqual({
      minX: 2400,
      minY: 2400,
      maxX: 3080,
      maxY: 2760,
    });
  });

  it("keeps tail append hook aligned to the rendered height of the last step", () => {
    const steps = [step("a", 2400, 2400)];

    const base = getTailAppendConnectorGeometry(steps, false, {});
    const tall = getTailAppendConnectorGeometry(steps, false, { a: 300 });

    expect(base).not.toBeNull();
    expect(tall).not.toBeNull();
    expect(tall!.hookTop).toBeGreaterThan(base!.hookTop);
  });
});
