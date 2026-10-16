import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FastButtonsModal } from "../FastButtonsModal";

const mockFetchFastButtons = jest.fn();
const mockGenerateSuggestions = jest.fn();

jest.mock("../fastButtonsApi", () => ({
  fetchFastButtons: (...args: unknown[]) => mockFetchFastButtons(...args),
  generateFastButtonSuggestions: (...args: unknown[]) => mockGenerateSuggestions(...args),
  acceptFastButtonSuggestions: jest.fn(),
  deleteFastButton: jest.fn(),
  upsertFastButton: jest.fn(),
}));

const mockT = (_k: string, fallback: string) => fallback;
const mockLangObj = { t: mockT };
jest.mock("@/lib/providers/LanguageProvider", () => ({
  useLanguage: () => mockLangObj,
}));

describe("FastButtonsModal resilience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFastButtons.mockResolvedValue([]);
    mockGenerateSuggestions.mockResolvedValue([]);
  });

  it("renders title and empty state when API returns empty list", async () => {
    mockFetchFastButtons.mockResolvedValue([]);
    render(<FastButtonsModal onClose={() => undefined} />);
    expect(await screen.findByText("Fast buttons")).toBeInTheDocument();
    expect((await screen.findAllByText("New button")).length).toBeGreaterThan(0);
  });

  it("opens create button drawer on clicking New button", async () => {
    mockFetchFastButtons.mockResolvedValue([]);
    render(<FastButtonsModal onClose={() => undefined} />);
    const newBtns = await screen.findAllByText("New button");
    fireEvent.click(newBtns[0]);
    expect(await screen.findByText("Create Fast Button")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. List git branches")).toBeInTheDocument();
  });

  it("renders buttons with kind badge and run button", async () => {
    mockFetchFastButtons.mockResolvedValue([
      {
        id: "btn-1",
        label: "Git Status Check",
        kind: "shell_command",
        config: { command: "git status" },
        sortOrder: 1,
      },
    ]);
    render(<FastButtonsModal onClose={() => undefined} />);
    expect(await screen.findByText("Git Status Check")).toBeInTheDocument();
    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();
  });
});
