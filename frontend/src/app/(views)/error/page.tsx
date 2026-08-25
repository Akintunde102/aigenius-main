"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { PublicPageShell } from "@/app/components/PublicPageShell";

const ErrorPage = () => {
  return (
    <PublicPageShell>
      <div className="content-centered">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "3rem",
          height: "3rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          background: "rgba(245, 158, 11, 0.1)",
          color: "#f59e0b",
          marginBottom: "1.5rem"
        }}>
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>

        <h1 className="headline">Something went wrong</h1>

        <p className="subtext">
          An unexpected error occurred. Please try again, or head back to
          the home page.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.75rem",
              background: "#18181b",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              transition: "transform 0.1s, filter 0.1s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.2)")}
            onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Go back to the home page
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
};

export default ErrorPage;
