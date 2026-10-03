import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CloudFile } from "@/app/components/file/file.interface";
import { UserFilesBrowser } from "./UserFilesBrowser";
import type { UploadedFilesLibraryState } from "./useUploadedFilesList";

jest.mock("lucide-react", () => {
  const Stub = () => null;
  return new Proxy(
    { __esModule: true },
    {
      get: () => Stub,
    },
  );
});

const copyMock = jest.fn((_text: string) => true);
jest.mock("copy-to-clipboard", () => ({
  __esModule: true,
  default: (text: string) => copyMock(text),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockOpenFilePreview = jest.fn();
jest.mock("@/app/components/modals/FilePreviewManager", () => ({
  __esModule: true,
  openFilePreview: (...args: any[]) => mockOpenFilePreview(...args),
  closeFilePreview: jest.fn(),
  filePreviewEmitter: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

jest.mock("@/app/components/model-interface/features/message-types/components/ImagePreviewLightbox", () => ({
  __esModule: true,
  ImagePreviewLightbox: ({ imageUrl, onClose }: any) => (
    <div data-testid="image-preview-lightbox" onClick={onClose}>
      {typeof imageUrl === "string" ? imageUrl : imageUrl?.fileName}
    </div>
  ),
}));

function file(partial: Partial<CloudFile> & Pick<CloudFile, "id">): CloudFile {
  return {
    name: "x",
    originalName: "x",
    ownedBy: "u1",
    s3Link: "https://example.com/f",
    updatedAt: "2020-01-01",
    createdAt: "2020-01-01T12:00:00.000Z",
    ...partial,
  };
}

function libraryState(
  overrides: Partial<UploadedFilesLibraryState>,
): UploadedFilesLibraryState {
  return {
    files: [],
    loading: false,
    isRefreshing: false,
    fetchError: null,
    refresh: jest.fn(),
    ...overrides,
  };
}

describe("UserFilesBrowser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders gallery tiles from library prop", () => {
    const files = [
      file({
        id: "a",
        name: "photo.png",
        originalName: "photo",
        s3Link: "https://cdn.example.com/photo.png",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="page"
        library={libraryState({ files })}
      />,
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("modal browse uses library list rows", () => {
    const files = [
      file({
        id: "a",
        name: "photo.png",
        originalName: "photo",
        s3Link: "https://cdn.example.com/photo.png",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="modal"
        library={libraryState({ files })}
      />,
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
  });

  it("filters by search query", () => {
    const files = [
      file({
        id: "1",
        name: "alpha.png",
        originalName: "alpha",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
      file({
        id: "2",
        name: "beta.pdf",
        originalName: "beta",
        createdAt: "2020-02-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="page"
        library={libraryState({ files })}
      />,
    );

    const search = screen.getByRole("searchbox", { name: /search files/i });
    fireEvent.change(search, { target: { value: "beta" } });

    expect(screen.getByText("beta.pdf")).toBeInTheDocument();
    expect(screen.queryByText("alpha.png")).not.toBeInTheDocument();
  });

  it("page browse copies link from card action menu", () => {
    const files = [
      file({
        id: "x",
        name: "a.png",
        originalName: "a.png",
        s3Link: "https://cdn.example.com/a.png",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="page"
        library={libraryState({ files })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    expect(copyMock).toHaveBeenCalledWith("https://cdn.example.com/a.png");
  });

  it("pick mode shows selection feedback and top attach toolbar", () => {
    const files = [
      file({
        id: "img-1",
        name: "photo.png",
        originalName: "photo.png",
        s3Link: "https://cdn.example.com/photo.png",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];
    const onConfirmPick = jest.fn();

    render(
      <UserFilesBrowser
        variant="modal"
        mode="pick"
        library={libraryState({ files })}
        onConfirmPick={onConfirmPick}
      />,
    );

    expect(screen.getByRole("button", { name: /^attach$/i })).toBeDisabled();
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /photo\.png/i }));

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("option", { selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^attach$/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /^attach$/i }));
    expect(onConfirmPick).toHaveBeenCalledWith([expect.objectContaining({ id: "img-1" })]);
  });

  it("modal browse opens ImagePreviewLightbox when image row is clicked", () => {
    const files = [
      file({
        id: "img-1",
        name: "landscape.png",
        originalName: "landscape.png",
        s3Link: "https://cdn.example.com/landscape.png",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="modal"
        library={libraryState({ files })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /landscape\.png/i }));
    expect(screen.getByTestId("image-preview-lightbox")).toBeInTheDocument();
  });

  it("modal browse opens openFilePreview for non-image files", () => {
    const files = [
      file({
        id: "code-1",
        name: "main.ts",
        originalName: "main.ts",
        s3Link: "https://cdn.example.com/main.ts",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];

    render(
      <UserFilesBrowser
        variant="modal"
        library={libraryState({ files })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /main\.ts/i }));
    expect(mockOpenFilePreview).toHaveBeenCalledWith({
      url: "https://cdn.example.com/main.ts",
      name: "main.ts",
      type: "code",
    });
  });
});
