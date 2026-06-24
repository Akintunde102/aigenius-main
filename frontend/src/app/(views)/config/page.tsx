"use client";

import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { UserFilesPanel } from "./UserFilesPanel";

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-sm"
          >
            <FiArrowLeft size={16} aria-hidden />
            Back to chat
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            Manage how you work with the app. Your uploads are listed below by
            category.
          </p>
        </header>

        <UserFilesPanel />
      </div>
    </div>
  );
}
