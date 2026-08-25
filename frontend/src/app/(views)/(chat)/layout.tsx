import AuthenticatedChatPage from "@/app/components/AuthenticatedChatPage";
import { ChatShellLoadingSkeleton } from "@/app/components/ChatShellLoadingSkeleton";
import React, { Suspense } from "react";
import { cookies } from "next/headers";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // AuthenticatedChatPage acts as the persistent layout wrapper
  // It reads params internally to pass to ModelInterface
  // Suspense: useSearchParams() in AuthenticatedChatPage otherwise deopts the whole / route to CSR.
  const cookieStore = cookies();
  const serverHasSession = Boolean(cookieStore.get("nobox_token")?.value) || Boolean(cookieStore.get("nobox_client_token")?.value);

  return (
    <Suspense fallback={<ChatShellLoadingSkeleton />}>
      <AuthenticatedChatPage serverHasSession={serverHasSession} />
    </Suspense>
  );
}
