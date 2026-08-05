import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthPage } from "./AuthPage";

// Isolate the auth surface: the shell header/footer carry their own nav links
// ("Sign in", "Sign up") that would collide with variant-specific queries.
jest.mock("@/app/components/PublicPageShell", () => ({
  PublicPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/app/components/ui", () => ({
  LandingAmbientBackground: () => null,
}));

jest.mock("@/app/components/auth/GoogleSignIn", () => ({
  GoogleSignIn: ({ variant }: { variant: string }) => (
    <button type="button" data-testid="google-sign-in" data-variant={variant}>
      {variant === "signup" ? "Continue with Google" : "Sign in with Google"}
    </button>
  ),
}));

describe("AuthPage", () => {
  describe("login variant", () => {
    it("renders the welcome-back heading and subtitle", () => {
      render(<AuthPage variant="login" />);

      expect(
        screen.getByRole("heading", { name: "Welcome back" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Sign in to continue to your workspace"),
      ).toBeInTheDocument();
    });

    it("renders the Google sign-in CTA in login mode", () => {
      render(<AuthPage variant="login" />);

      expect(screen.getByTestId("google-sign-in")).toHaveAttribute(
        "data-variant",
        "login",
      );
    });

    it("links to signup for users without an account", () => {
      render(<AuthPage variant="login" />);

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
        "href",
        "/signup",
      );
    });

    it("renders privacy and terms links without the signup agreement copy", () => {
      render(<AuthPage variant="login" />);

      expect(
        screen.getByRole("link", { name: "Privacy Policy" }),
      ).toHaveAttribute("href", "/docs/privacy-policy");
      expect(
        screen.getByRole("link", { name: "Terms of Service" }),
      ).toHaveAttribute("href", "/docs/terms-and-conditions");
      expect(
        screen.queryByText(/By creating an account, you agree/),
      ).not.toBeInTheDocument();
    });
  });

  describe("signup variant", () => {
    it("renders the create-account heading and subtitle", () => {
      render(<AuthPage variant="signup" />);

      expect(
        screen.getByRole("heading", { name: "Create your account" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Every top AI model, in one workspace"),
      ).toBeInTheDocument();
    });

    it("renders the Google sign-in CTA in signup mode", () => {
      render(<AuthPage variant="signup" />);

      expect(screen.getByTestId("google-sign-in")).toHaveAttribute(
        "data-variant",
        "signup",
      );
    });

    it("links to login for existing users", () => {
      render(<AuthPage variant="signup" />);

      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/login",
      );
    });

    it("shows the terms agreement copy with working legal links", () => {
      render(<AuthPage variant="signup" />);

      expect(
        screen.getByText(/By creating an account, you agree to our/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Terms of Service" }),
      ).toHaveAttribute("href", "/docs/terms-and-conditions");
      expect(
        screen.getByRole("link", { name: "Privacy Policy" }),
      ).toHaveAttribute("href", "/docs/privacy-policy");
    });
  });

  describe("shared surface", () => {
    it.each(["login", "signup"] as const)(
      "renders the secure-authentication divider and trust row (%s)",
      (variant) => {
        render(<AuthPage variant={variant} />);

        expect(screen.getByText("Secure authentication")).toBeInTheDocument();
        expect(
          screen.getByText("GPT, Claude, Gemini & more"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Pay only for what you use"),
        ).toBeInTheDocument();
        expect(screen.getByText("Web & desktop app")).toBeInTheDocument();
      },
    );
  });
});
