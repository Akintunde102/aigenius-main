"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DISPLAY } from "@/app/components/landing/typography";
import { PublicPageShell } from "@/app/components/PublicPageShell";

const ErrorPage = () => {
  return (
    <PublicPageShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <h1 className={`${DISPLAY} text-4xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-5xl`}>
          Something went wrong
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-lp-muted">
          An unexpected error occurred. Please try again, or head back to the home page.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-stone-900 px-7 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Go back to the home page
        </Link>
      </div>
    </PublicPageShell>
  );
};

export default ErrorPage;