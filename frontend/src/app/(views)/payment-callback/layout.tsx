import { PublicPageShell } from "@/app/components/PublicPageShell";

export default function PaymentCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell contentClassName="justify-center">{children}</PublicPageShell>;
}
