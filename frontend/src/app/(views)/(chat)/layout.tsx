import AuthenticatedChatPage from "@/app/components/AuthenticatedChatPage";
import { ChatShellLoadingSkeleton } from "@/app/components/ChatShellLoadingSkeleton";
import React, { Suspense } from "react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // AuthenticatedChatPage acts as the persistent layout wrapper
  // It reads params internally to pass to ModelInterface
  // Suspense: useSearchParams() in AuthenticatedChatPage otherwise deopts the whole / route to CSR.
  return (
    <Suspense fallback={<ChatShellLoadingSkeleton />}>
      <AuthenticatedChatPage />
    </Suspense>
  );
}
