"use client";
import { Toaster } from "react-hot-toast";
import "./schedule-notification-toast.scss";

export default function GlobalToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          fontSize: "14px",
          background: "rgba(47, 49, 50, 0.95)",
          color: "#fff",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          backdropFilter: "blur(12px)",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
