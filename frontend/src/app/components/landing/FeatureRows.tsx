"use client";

import { DesktopDemo } from "./DesktopDemo";
import { FeatureSection, type FeatureItem } from "./FeatureSection";
import { ModelSwitchPreview } from "./ModelSwitchPreview";
import { ToolsDemo } from "./ToolsDemo";
import { WalletDemo } from "./WalletDemo";
import { useLanguage } from "@/lib/providers/LanguageProvider";

/**
 * The ids are the targets of the header links (#models, #desktop, #tools, #pricing).
 * Copy is one line and one sentence on purpose. The preview does the explaining.
 */
export function FeatureRows() {
  const { t } = useLanguage();

  const items: readonly FeatureItem[] = [
    {
      id: "models",
      title: t("landing.featureModelsTitle", "Switch models mid-conversation."),
      body: t(
        "landing.featureModelsBody",
        "Pick Claude, GPT, Gemini or DeepSeek from the message box. Every reply shows what it cost.",
      ),
      hint: t("landing.featureModelsHint", "Try it: pick another model."),
      cta: {
        label: t("landing.tryOnWeb", "Try it on the web"),
        href: "/login",
      },
      showDownload: true,
      decorative: false,
      visual: <ModelSwitchPreview />,
    },
    {
      id: "desktop",
      title: t("landing.featureDesktopTitle", "Works on your machine. Asks before it acts."),
      body: t(
        "landing.featureDesktopBody",
        "The desktop app reads your files and runs commands in your projects. Anything that changes something waits for your approval.",
      ),
      decorative: true,
      visual: <DesktopDemo />,
    },
    {
      id: "tools",
      title: t("landing.featureToolsTitle", "Reads your PDFs, searches the web, checks your inbox."),
      body: t(
        "landing.featureToolsBody",
        "Analyze reports, search the web, and query your inbox. Sensitive actions always wait for your approval.",
      ),
      decorative: true,
      visual: <ToolsDemo />,
    },
    {
      id: "pricing",
      title: t("landing.featurePricingTitle", "Pay for what you use. Nothing else."),
      body: t(
        "landing.featurePricingBody",
        "No monthly plan. Top up when you like and spend credits one message at a time.",
      ),
      cta: {
        label: t("landing.startWithFreeCredits", "Start with free credits"),
        href: "/login",
      },
      decorative: true,
      visual: <WalletDemo />,
    },
  ];

  return (
    <>
      {items.map((item, index) => (
        <FeatureSection key={item.id} item={item} flip={index % 2 === 1} />
      ))}
    </>
  );
}

