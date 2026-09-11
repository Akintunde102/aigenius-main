import React from "react";
import { render, screen } from "@testing-library/react";
import { AUTH_CONFIG } from "@/lib/config/auth";
import { DevLoginButton } from "../DevLoginButton";
import "@testing-library/jest-dom";

jest.mock("@/lib/config/auth", () => ({
  AUTH_CONFIG: {
    ENABLE_DEV_LOGIN: false,
  },
}));

describe("DevLoginButton", () => {
  afterEach(() => {
    // @ts-expect-error test override
    AUTH_CONFIG.ENABLE_DEV_LOGIN = false;
  });

  it("does not render when ENABLE_DEV_LOGIN is false", () => {
    // @ts-expect-error test override
    AUTH_CONFIG.ENABLE_DEV_LOGIN = false;
    render(<DevLoginButton />);
    expect(screen.queryByText(/Developer Login \(Bypass\)/i)).not.toBeInTheDocument();
  });

  it("renders when ENABLE_DEV_LOGIN is true", () => {
    // @ts-expect-error test override
    AUTH_CONFIG.ENABLE_DEV_LOGIN = true;
    render(<DevLoginButton />);
    expect(screen.getByRole("button", { name: /Developer Login \(Bypass\)/i })).toBeInTheDocument();
  });
});
