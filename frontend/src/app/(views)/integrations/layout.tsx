import { PublicPageShell } from "@/app/components/PublicPageShell";

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
