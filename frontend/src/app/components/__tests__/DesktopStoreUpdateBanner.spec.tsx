/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import DesktopStoreUpdateBanner from "../DesktopStoreUpdateBanner";

const payload = {
  requiredShellVersion: "2.0.0",
  installedShellVersion: "1.0.0",
  updateChannel: "microsoft-store" as const,
};

describe("DesktopStoreUpdateBanner", () => {
  const originalDesktop = window.aigeniusDesktop;

  beforeEach(() => {
    document.documentElement.setAttribute("data-aigenius-desktop-shell", "1");
    window.aigeniusDesktop = {
      isDesktop: true,
      onShellUpdateRequired: (handler) => {
        handler(payload);
        return () => {};
      },
      checkUiOta: jest.fn().mockResolvedValue({ status: "skipped" }),
      openShellUpdatePage: jest.fn().mockResolvedValue({ ok: true }),
    };
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-aigenius-desktop-shell");
    window.aigeniusDesktop = originalDesktop;
  });

  it("shows Store update prompt when shell is incompatible", () => {
    render(<DesktopStoreUpdateBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Update available in Microsoft Store/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.0\.0/)).toBeInTheDocument();
  });

  it("opens Store page when user clicks update", () => {
    render(<DesktopStoreUpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: /Open Microsoft Store/i }));
    expect(window.aigeniusDesktop?.openShellUpdatePage).toHaveBeenCalled();
  });

  it("hides banner after dismiss until a newer required version", () => {
    render(<DesktopStoreUpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: /Not now/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
