"use client";

import Link from "next/link";
import { BotMessageSquare, MonitorDown, Wallet } from "lucide-react";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";
import { useLanguage } from "@/lib/providers/LanguageProvider";

export type AuthPageVariant = "login" | "signup";

function LegalBlock({ variant }: { variant: AuthPageVariant }) {
  const { t } = useLanguage();
  if (variant === "signup") {
    return (
      <p style={{ fontSize: "13px", color: "#71717a", marginTop: "1.5rem" }}>
        {t("auth.agreeLead", "By creating an account, you agree to our")}{" "}
        <Link prefetch href="/docs/terms-and-conditions" style={{ color: "inherit", textDecoration: "underline" }}>
          {t("landing.termsOfService", "Terms of Service")}
        </Link>{" "}
        and{" "}
        <Link prefetch href="/docs/privacy-policy" style={{ color: "inherit", textDecoration: "underline" }}>
          {t("landing.privacyPolicy", "Privacy Policy")}
        </Link>
        .
      </p>
    );
  }

  return (
    <p style={{ fontSize: "13px", color: "#71717a", marginTop: "1.5rem" }}>
      <Link prefetch href="/docs/privacy-policy" style={{ color: "inherit", textDecoration: "underline" }}>
        {t("landing.privacyPolicy", "Privacy Policy")}
      </Link>
      <span style={{ margin: "0 0.5rem" }} aria-hidden>·</span>
      <Link prefetch href="/docs/terms-and-conditions" style={{ color: "inherit", textDecoration: "underline" }}>
        {t("landing.termsOfService", "Terms of Service")}
      </Link>
    </p>
  );
}

export function AuthPage({ variant }: { variant: AuthPageVariant }) {
  const { t } = useLanguage();
  const copy = variant === "login"
    ? {
        title: t("auth.welcomeBack", "Welcome back"),
        subtitle: t("auth.signInSubtitle", "Sign in to continue to your workspace"),
        swapPrompt: t("auth.dontHaveAccount", "Don't have an account?"),
        swapLabel: t("auth.signUp", "Sign up"),
        swapHref: "/signup",
      }
    : {
        title: t("auth.createAccount", "Create your account"),
        subtitle: t(
          "auth.createAccountSubtitle",
          "Start with {credits} free credits — every top AI model in one workspace",
          { credits: SIGNUP_BONUS_CREDITS },
        ),
        swapPrompt: t("auth.alreadyHaveAccount", "Already have an account?"),
        swapLabel: t("auth.signIn", "Sign in"),
        swapHref: "/login",
      };
  const trustItems = [
    { icon: BotMessageSquare, label: t("auth.trustModels", "GPT, Claude, Gemini & more") },
    { icon: Wallet, label: t("auth.trustPay", "Pay only for what you use") },
    { icon: MonitorDown, label: t("auth.trustApps", "Web & desktop app") },
  ];

  return (
    <PublicPageShell>
      <div className="content-centered">
        <h1 className="headline">{copy.title}</h1>
        <p className="subtext">{copy.subtitle}</p>

        {variant === "signup" ? (
          <div style={{
            border: "1px solid rgba(249,115,22, 0.2)",
            background: "rgba(249,115,22, 0.05)",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "#f97316",
            lineHeight: "1.5"
          }}>
            {t(
              "auth.signUpBonusNotice",
              "{credits} free credits land in your wallet when you sign up — no credit card required.",
              { credits: SIGNUP_BONUS_CREDITS },
            )}
          </div>
        ) : null}

        <div style={{ width: "100%", maxWidth: "300px", marginBottom: "1.5rem" }}>
          <GoogleSignIn
            variant={variant}
            className="!h-11 !rounded-xl !text-[15px] !font-medium !bg-[#f5f5f0] !text-[#0e0d0c] hover:!bg-[#e5e5e0] transition-colors"
          />
        </div>

        <div style={{ fontSize: "0.6875rem", color: "#52525b", marginBottom: "1.5rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
          {t("auth.secureAuth", "Secure authentication")}
        </div>

        <p style={{ fontSize: "0.8125rem", color: "#71717a", marginBottom: "1.5rem", lineHeight: "1.6" }}>
          {t(
            "auth.googleAuthNote",
            "We use Google's secure authentication system. Your data is protected and never shared with third parties.",
          )}
        </p>

        <p style={{ fontSize: "0.9375rem" }}>
          {copy.swapPrompt}{" "}
          <Link
            prefetch
            href={copy.swapHref}
            style={{ fontWeight: 600, color: "#f97316", textDecoration: "underline", textUnderlineOffset: "4px" }}
          >
            {copy.swapLabel}
          </Link>
        </p>

        <LegalBlock variant={variant} />

        <ul style={{
          marginTop: "3.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1.5rem",
          listStyle: "none",
          fontSize: "0.75rem",
          color: "#71717a"
        }}>
          {trustItems.map(({ icon: Icon, label }) => (
            <li key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon style={{ width: "1rem", height: "1rem", color: "#52525b" }} aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </PublicPageShell>
  );
}

export default AuthPage;
