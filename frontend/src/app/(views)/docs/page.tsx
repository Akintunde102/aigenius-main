import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { DISPLAY } from "@/app/components/landing/typography";
import {
  DOCS_FOCUS,
  DOCS_LINK_CLASS,
  DOCS_SURFACE_CARD,
} from "./docs-shell.constants";
import { cn } from "@/lib/utils";

const DOCS = [
  {
    href: "/docs/privacy-policy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data when you use AIGenius.",
  },
  {
    href: "/docs/terms-and-conditions",
    title: "Terms of Service",
    description: "The terms that govern your access to and use of AIGenius.",
  },
] as const;

export default function DocsIndexPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-28 pt-14 sm:px-8 lg:pt-24">
      <header className="max-w-2xl">
        <h1 className={`${DISPLAY} text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-6xl`}>
          Policies &amp; terms
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-lp-muted">
          Transparency matters. Read our policies to understand how we operate and how we protect your data.
        </p>
      </header>

      {/* Links in a plain nav, not a <ul>: a global list rule was indenting lists. */}
      <nav aria-label="Documents" className="mt-14 grid gap-3 sm:grid-cols-2">
        {DOCS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className={cn(
              "group flex min-h-44 flex-col justify-between gap-8 p-7 text-left transition-colors duration-200 hover:bg-black/[0.07] dark:hover:bg-white/[0.08]",
              DOCS_SURFACE_CARD,
              DOCS_FOCUS,
            )}
          >
            <div>
              <span className={`${DISPLAY} block text-[1.6rem] leading-[1.15] tracking-[-0.015em]`}>{doc.title}</span>
              <span className="mt-3 block text-[15px] leading-relaxed text-lp-muted">{doc.description}</span>
            </div>
            <span className="inline-flex items-center text-sm font-medium text-lp-muted transition-colors duration-200 group-hover:text-lp-fg">
              Read document
              <FiArrowRight
                className="ml-1 h-4 w-4 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </nav>

      <p className="mt-14 text-sm text-lp-muted">
        Questions? Contact us at{" "}
        <a href="mailto:nobox.hq@gmail.com" className={cn(DOCS_LINK_CLASS, "text-lp-fg", DOCS_FOCUS)}>
          nobox.hq@gmail.com
        </a>
      </p>
    </div>
  );
}