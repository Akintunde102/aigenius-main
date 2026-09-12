import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DesktopLoginPage from "./page";
import "@testing-library/jest-dom";

const mockSetAuthError = jest.fn();
const mockSetAuthFlowWithPersist = jest.fn();
const mockFinishOAuthToken = jest.fn();
const mockStartWebSignIn = jest.fn();
const mockStartOAuthSignIn = jest.fn();
const mockUseDesktopSessionRestore = jest.fn();
const mockUseDesktopAuthFlow = jest.fn();

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

jest.mock("@/app/components/PublicPageShell", () => ({
  PublicPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/lib/hooks/use-desktop-session-restore", () => ({
  useDesktopSessionRestore: () => mockUseDesktopSessionRestore(),
}));

jest.mock("@/lib/hooks/use-desktop-auth-flow", () => ({
  useDesktopAuthFlow: () => mockUseDesktopAuthFlow(),
}));

jest.mock("@/lib/utils/desktop-auth-flow-storage", () => {
  let phase = "idle";
  return {
    readDesktopAuthFlowPhase: () => phase,
    writeDesktopAuthFlowPhase: (next: string) => {
      phase = next === "idle" ? "idle" : next;
    },
  };
});

jest.mock("@/lib/calls/get-logged-user-details", () => ({
  getStoredUserDetailsSnapshot: () => null,
}));

jest.mock("@/app/components/auth/DevLoginButton", () => ({
  DevLoginButton: () => (
    <button type="button">Developer Login (Bypass)</button>
  ),
}));

function stubIdleAuthFlow() {
  mockUseDesktopSessionRestore.mockReturnValue({ restoring: false });
  mockUseDesktopAuthFlow.mockReturnValue({
    authFlow: "idle",
    authError: null,
    setAuthError: mockSetAuthError,
    setAuthFlowWithPersist: (phase: string) => {
      mockSetAuthFlowWithPersist(phase);
      const { writeDesktopAuthFlowPhase } = jest.requireMock(
        "@/lib/utils/desktop-auth-flow-storage",
      ) as { writeDesktopAuthFlowPhase: (next: string) => void };
      writeDesktopAuthFlowPhase(phase);
    },
    finishOAuthToken: mockFinishOAuthToken,
  });
}

describe("DesktopLoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { writeDesktopAuthFlowPhase } = jest.requireMock(
      "@/lib/utils/desktop-auth-flow-storage",
    ) as { writeDesktopAuthFlowPhase: (next: string) => void };
    writeDesktopAuthFlowPhase("idle");
    stubIdleAuthFlow();
    window.aigeniusDesktop = {
      isDesktop: true,
      startOAuthSignIn: mockStartOAuthSignIn,
      startWebSignIn: mockStartWebSignIn,
    };
  });

  it("shows Google sign-in instead of a second web auth page", () => {
    render(<DesktopLoginPage />);

    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in with Browser" }),
    ).not.toBeInTheDocument();
  });

  it("keeps developer login as a secondary action", () => {
    render(<DesktopLoginPage />);

    expect(
      screen.getByRole("button", { name: /Developer Login \(Bypass\)/i }),
    ).toBeInTheDocument();
  });

  it("starts Google OAuth in the system browser and finishes with the returned token", async () => {
    mockStartOAuthSignIn.mockResolvedValue({ token: "desktop-token" });
    render(<DesktopLoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(mockStartOAuthSignIn).toHaveBeenCalledWith({ provider: "google" });
      expect(mockStartWebSignIn).not.toHaveBeenCalled();
      expect(mockSetAuthFlowWithPersist).toHaveBeenCalledWith("awaiting-browser");
      expect(mockFinishOAuthToken).toHaveBeenCalledWith("desktop-token");
    });
  });

  it("falls back to startWebSignIn when startOAuthSignIn is missing", async () => {
    window.aigeniusDesktop = {
      isDesktop: true,
      startWebSignIn: mockStartWebSignIn,
    };
    mockStartWebSignIn.mockResolvedValue({ token: "desktop-token" });
    render(<DesktopLoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(mockStartWebSignIn).toHaveBeenCalledTimes(1);
      expect(mockFinishOAuthToken).toHaveBeenCalledWith("desktop-token");
    });
  });

  it("resets the flow when Google sign-in returns no token", async () => {
    mockStartOAuthSignIn.mockResolvedValue({ token: null });
    render(<DesktopLoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(mockSetAuthFlowWithPersist).toHaveBeenCalledWith("idle");
      expect(mockSetAuthError).toHaveBeenCalledWith(
        expect.stringMatching(/Google sign-in did not complete/),
      );
    });
    expect(mockFinishOAuthToken).not.toHaveBeenCalled();
  });

  it("hides the sign-in form while restoring a session", () => {
    mockUseDesktopSessionRestore.mockReturnValue({ restoring: true });
    render(<DesktopLoginPage />);

    expect(
      screen.queryByRole("button", { name: "Sign in with Google" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Opening AIGenius…")).toBeInTheDocument();
  });
});
