import { PublicPageShell } from "@/app/components/PublicPageShell";

export default function PublishedConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
