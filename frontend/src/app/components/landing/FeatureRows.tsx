import { DesktopDemo } from "./DesktopDemo";
import { FeatureSection, type FeatureItem } from "./FeatureSection";
import { ModelSwitchPreview } from "./ModelSwitchPreview";
import { ToolsDemo } from "./ToolsDemo";
import { WalletDemo } from "./WalletDemo";

/**
 * The ids are the targets of the header links (#models, #desktop, #tools, #pricing).
 * Copy is one line and one sentence on purpose. The preview does the explaining.
 */
const ITEMS: readonly FeatureItem[] = [
  {
    id: "models",
    title: "Switch models mid-conversation.",
    body: "Pick Claude, GPT, Gemini or DeepSeek from the message box. Every reply shows what it cost.",
    hint: "Try it: pick another model.",
    cta: { label: "Try it on the web", href: "/login" },
    showDownload: true,
    decorative: false,
    visual: <ModelSwitchPreview />,
  },
  {
    id: "desktop",
    title: "Works on your machine. Asks before it acts.",
    body: "The desktop app reads your files and runs commands in your projects. Anything that changes something waits for your approval.",
    hint: "Plays on its own.",
    decorative: true,
    visual: <DesktopDemo />,
  },
  {
    id: "tools",
    title: "Reads your PDFs, searches the web, checks your inbox.",
    body: "Analyze reports, search the web, and query your inbox. Sensitive actions always wait for your approval.",
    hint: "Plays on its own.",
    decorative: true,
    visual: <ToolsDemo />,
  },
  {
    id: "pricing",
    title: "Pay for what you use. Nothing else.",
    body: "No monthly plan. Top up when you like and spend credits one message at a time.",
    hint: "Plays on its own.",
    cta: { label: "Start with free credits", href: "/login" },
    decorative: true,
    visual: <WalletDemo />,
  },
];

export function FeatureRows() {
  return (
    <>
      {ITEMS.map((item, index) => (
        <FeatureSection key={item.id} item={item} flip={index % 2 === 1} />
      ))}
    </>
  );
}
