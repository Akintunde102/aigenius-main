import { BotMessageSquare, FolderOpen, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { ENTER } from "@/app/components/landing/constants";
import { Logo } from "@/app/components/landing/Logo";
import { DISPLAY } from "@/app/components/landing/typography";

/**
 * Presentation only. Shared by the desktop sign-in and welcome pages so they look like the web
 * auth page: the logo, a serif heading, one solid pill button, and a quiet row of reassurances.
 * Nothing here touches auth state, handlers or navigation.
 */

/**
 * Plain stone colours instead of bg-lp-fg: that background was not rendering in the browser,
 * which left a bare line of text instead of a button.
 */
export const DESKTOP_PRIMARY_BUTTON =
  "flex h-12 w-full items-center justify-center gap-3 rounded-full bg-stone-900 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 dark:bg-white dark:text-stone-900";

export const DESKTOP_TEXT_LINK =
  "underline underline-offset-4 transition-colors duration-150 hover:text-lp-fg";

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: FolderOpen, label: "Local files" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

export function DesktopAuthFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${ENTER} mx-auto flex w-full max-w-[22rem] flex-col items-center px-6 py-14 text-center`}
    >
      <Logo />
      {children}
    </div>
  );
}

interface DesktopAuthHeadingProps {
  title: string;
  subtitle: string;
}

export function DesktopAuthHeading({
  title,
  subtitle,
}: DesktopAuthHeadingProps) {
  return (
    <>
      <h1
        className={`${DISPLAY} mt-12 text-[2.25rem] font-normal leading-[1.05] tracking-[-0.03em]`}
      >
        {title}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-lp-muted">{subtitle}</p>
    </>
  );
}

/**
 * Divs with list roles instead of <ul>/<li>: a global list rule in the project CSS was
 * indenting every list.
 */
export function DesktopTrustRow() {
  return (
    <div
      role="list"
      className="mt-14 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-lp-muted"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <div key={label} role="listitem" className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
