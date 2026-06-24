import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MyFilesModal from "./MyFilesModal";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";

jest.mock("@/app/components/user-files/UserFilesBrowser", () => ({
  UserFilesBrowser: () => <div data-testid="user-files-browser" />,
}));

function libraryStub(): UploadedFilesLibraryState {
  return {
    files: [],
    loading: false,
    isRefreshing: false,
    fetchError: null,
    refresh: jest.fn(),
  };
}

describe("MyFilesModal", () => {
  beforeEach(() => {
    const root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders title, embeds browser, and calls onClose when close is clicked", () => {
    const onClose = jest.fn();
    render(<MyFilesModal onClose={onClose} library={libraryStub()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("My files")).toBeInTheDocument();
    expect(screen.getByTestId("user-files-browser")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
