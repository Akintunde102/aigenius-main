import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
          Legal center
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Policies &amp; terms
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
          Transparency matters. Read our policies to understand how we operate and how we protect your
          data.
        </p>
      </header>

      <ul className="mx-auto mt-10 grid max-w-2xl gap-4">
        {DOCS.map((doc) => (
          <li key={doc.href}>
            <Link
              href={doc.href}
              className={cn(
                "group flex flex-col p-6 text-left transition hover:border-cyan-300/70 hover:shadow-md sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-7",
                DOCS_SURFACE_CARD,
                DOCS_FOCUS,
              )}
            >
              <div className="min-w-0 flex-1">
                <span className="block font-semibold tracking-tight text-stone-900 group-hover:text-cyan-900">
                  {doc.title}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-stone-600">
                  {doc.description}
                </span>
              </div>
              <span className="mt-4 inline-flex shrink-0 items-center text-sm font-semibold text-cyan-800 sm:mt-0">
                Read document
                <FiArrowRight
                  className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-12 max-w-lg text-center text-sm text-stone-600">
        Questions? Contact us at{" "}
        <a
          href="mailto:nobox.hq@gmail.com"
          className={cn(DOCS_LINK_CLASS, DOCS_FOCUS)}
        >
          nobox.hq@gmail.com
        </a>
      </p>
    </div>
  );
}
