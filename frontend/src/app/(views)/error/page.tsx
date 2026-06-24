"use client";

import Link from "next/link";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";

const ErrorPage = () => {
  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-6 text-zinc-400">
          <Link
            href="/"
            className={cn(
              "font-medium text-cyan-300 underline underline-offset-4 hover:text-cyan-200",
              FOCUS_RING,
            )}
          >
            Go back to the home page
          </Link>
        </p>
      </div>
    </PublicPageShell>
  );
};

export default ErrorPage;
