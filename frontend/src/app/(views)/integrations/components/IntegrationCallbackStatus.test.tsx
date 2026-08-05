import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntegrationCallbackStatus } from "./IntegrationCallbackStatus";

jest.mock("@/app/components/ui", () => ({
  LandingAmbientBackground: () => null,
}));

const baseProps = {
  message: "Completing Gmail connection…",
  showCloseButton: false,
};

describe("IntegrationCallbackStatus", () => {
  it("shows a spinner and auto-close hint while processing", () => {
    const { container } = render(
      <IntegrationCallbackStatus {...baseProps} done={false} succeeded={null} />,
    );

    expect(
      screen.getByText("Completing Gmail connection…"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This window will close automatically."),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-lucide="Loader2"]')).not.toBeNull();
    expect(container.querySelector('[data-lucide="CheckCircle2"]')).toBeNull();
    expect(container.querySelector('[data-lucide="XCircle"]')).toBeNull();
  });

  it("shows a success icon and manual-close hint when done and succeeded", () => {
    const { container } = render(
      <IntegrationCallbackStatus
        {...baseProps}
        done
        succeeded
        message="Connection successful! Closing..."
      />,
    );

    expect(
      screen.getByText("Connection successful! Closing..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You can close this tab if it doesn't close automatically."),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-lucide="CheckCircle2"]')).not.toBeNull();
    expect(container.querySelector('[data-lucide="XCircle"]')).toBeNull();
  });

  it("shows a failure icon when the connection failed", () => {
    const { container } = render(
      <IntegrationCallbackStatus
        {...baseProps}
        done
        succeeded={false}
        message="Connection failed. Closing..."
      />,
    );

    expect(screen.getByText("Connection failed. Closing...")).toBeInTheDocument();
    expect(container.querySelector('[data-lucide="XCircle"]')).not.toBeNull();
    expect(container.querySelector('[data-lucide="CheckCircle2"]')).toBeNull();
  });

  it("hides the close-window button until requested", () => {
    render(
      <IntegrationCallbackStatus {...baseProps} done succeeded={null} />,
    );

    expect(
      screen.queryByRole("button", { name: "Close window" }),
    ).not.toBeInTheDocument();
  });

  it("closes the window when the close button is clicked", () => {
    const closeSpy = jest.fn();
    const originalClose = window.close;
    window.close = closeSpy;

    try {
      render(
        <IntegrationCallbackStatus
          {...baseProps}
          done
          succeeded
          showCloseButton
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Close window" }));
      expect(closeSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.close = originalClose;
    }
  });
});
