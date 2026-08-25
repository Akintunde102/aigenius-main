"use client";

import { Loader2 } from "lucide-react";

/**
 * Shown while an existing desktop session is being restored (avoids flashing the sign-in form).
 */
export function DesktopSessionRestoringView({
  message = "Opening AIGenius…",
  detail = "Verifying your saved session…",
}: {
  message?: string;
  detail?: string;
}) {
  return (
    <div className="content-centered">
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "3.5rem",
        height: "3.5rem",
        borderRadius: "1rem",
        border: "1px solid rgba(6, 182, 212, 0.2)",
        background: "rgba(6, 182, 212, 0.1)",
        color: "#06b6d4",
        marginBottom: "1.5rem"
      }}>
        <Loader2 size={32} className="animate-spin" aria-hidden />
      </div>
      <h1 className="headline" style={{ fontSize: "1.5rem" }}>{message}</h1>
      {detail ? (
        <p className="subtext">{detail}</p>
      ) : null}
    </div>
  );
}
