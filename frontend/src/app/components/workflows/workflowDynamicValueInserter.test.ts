import { insertTokenAtCaret } from "./workflowsUtils";

describe("insertTokenAtCaret", () => {
  it("appends token when input element is null", () => {
    const onChange = jest.fn();
    insertTokenAtCaret(null, "hello", "{{x}}", onChange);
    expect(onChange).toHaveBeenCalledWith("hello{{x}}");
  });

  it("inserts token at caret and replaces selection", () => {
    const el = document.createElement("textarea");
    el.value = "prefixsuffix";
    el.setSelectionRange(6, 6);
    const onChange = jest.fn();
    insertTokenAtCaret(el, "prefixsuffix", "|", onChange);
    expect(onChange).toHaveBeenCalledWith("prefix|suffix");
  });

  it("replaces selected range with token", () => {
    const el = document.createElement("textarea");
    el.value = "abcdef";
    el.setSelectionRange(1, 4);
    const onChange = jest.fn();
    insertTokenAtCaret(el, "abcdef", "X", onChange);
    expect(onChange).toHaveBeenCalledWith("aXef");
  });
});
