import { render, screen } from "@testing-library/react";
import { DesktopSessionRestoringView } from "../DesktopSessionRestoringView";

describe("DesktopSessionRestoringView", () => {
  it("centers the loader and message", () => {
    const { container } = render(
      <DesktopSessionRestoringView message="Signing you in…" detail="One moment…" />,
    );

    expect(container.firstElementChild).toHaveClass("items-center", "text-center", "w-full");
    expect(screen.getByRole("heading", { name: "Signing you in…" })).toBeInTheDocument();
    expect(screen.getByText("One moment…")).toBeInTheDocument();
  });
});
