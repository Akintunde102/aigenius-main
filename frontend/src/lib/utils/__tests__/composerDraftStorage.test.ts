/**
 * @jest-environment jsdom
 */

import {
  COMPOSER_DRAFT_STORAGE_KEY,
  loadComposerDraftMap,
  persistComposerDraftMap,
  createDebouncedDraftPersist,
} from "../composerDraftStorage";

describe("composerDraftStorage", () => {
  let memory: Record<string, string>;

  beforeEach(() => {
    memory = {};
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: (k: string) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
        setItem: (k: string, v: string) => {
          memory[k] = v;
        },
        removeItem: (k: string) => {
          delete memory[k];
        },
        clear: () => {
          memory = {};
        },
      },
      writable: true,
      configurable: true,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loadComposerDraftMap returns empty object when storage is empty", () => {
    expect(loadComposerDraftMap()).toEqual({});
  });

  it("persistComposerDraftMap round-trips non-empty drafts", () => {
    persistComposerDraftMap({ __draft__: "hello", conv1: "x" });
    expect(loadComposerDraftMap()).toEqual({
      __draft__: "hello",
      conv1: "x",
    });
  });

  it("persistComposerDraftMap removes storage key when map is empty or whitespace-only", () => {
    persistComposerDraftMap({ a: "   " });
    expect(sessionStorage.getItem(COMPOSER_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("createDebouncedDraftPersist flushes after delay", () => {
    const debounced = createDebouncedDraftPersist(300);
    debounced({ k: "v" });
    expect(loadComposerDraftMap()).toEqual({});
    jest.advanceTimersByTime(300);
    expect(loadComposerDraftMap()).toEqual({ k: "v" });
  });
});
