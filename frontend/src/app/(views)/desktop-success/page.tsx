"use client";

import { PublicPageShell } from "@/app/components/PublicPageShell";
import { CheckCircle2 } from "lucide-react";

export default function DesktopSuccessPage() {
  return (
    <PublicPageShell>
      <div className="content-centered">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "1rem",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          background: "rgba(16, 185, 129, 0.1)",
          color: "#10b981",
          marginBottom: "1.5rem"
        }}>
          <CheckCircle2 size={32} aria-hidden />
        </div>

        <h1 className="headline">Sign-in successful</h1>
        <p className="subtext">
          You have successfully authenticated. You can now close this
          browser tab and return to the AIGenius Desktop application.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => window.close()}
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
              border: "none",
              cursor: "pointer",
              transition: "transform 0.1s, filter 0.1s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.2)")}
            onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            Close tab manually
          </button>
        </div>
      </div>
    </PublicPageShell>
  );
}
