import { themeForWorkflowCategory, WORKFLOW_TOOL_CATEGORY_THEME } from "./workflow-studio.theme";

describe("workflow-studio.theme", () => {
  it("maps known categories to defined themes", () => {
    expect(themeForWorkflowCategory("Search").tileLeftBorder).toBe(
      WORKFLOW_TOOL_CATEGORY_THEME.Search.tileLeftBorder,
    );
  });

  it("falls back for unknown categories", () => {
    expect(themeForWorkflowCategory("unknown-category")).toBe(WORKFLOW_TOOL_CATEGORY_THEME["Other tools"]);
  });
});
