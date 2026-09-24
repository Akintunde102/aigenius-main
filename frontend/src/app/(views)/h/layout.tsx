import { PublicPageShell } from "@/app/components/PublicPageShell";

export default function HostedFilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
