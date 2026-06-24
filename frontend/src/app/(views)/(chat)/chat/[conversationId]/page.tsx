interface ConversationPageProps {
  params: {
    conversationId: string;
  };
}

export default function ConversationPage({
  params,
}: ConversationPageProps) {
  // The layout.tsx renders AuthenticatedChatPage (which reads ConversationId internally).
  // This page is empty but exists to fulfill Next.js routing requirements for '/chat/[id]'.
  return null;
}
