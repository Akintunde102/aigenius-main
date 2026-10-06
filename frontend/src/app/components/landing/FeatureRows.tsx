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
    hint: "Try it: open the model menu and pick another model.",
    cta: { label: "Try it on the web", href: "/login" },
    decorative: false,
    visual: <ModelSwitchPreview />,
  },
  {
    id: "desktop",
    title: "Works on your machine. Asks before it acts.",
    body: "The desktop app reads your files and runs commands in your projects. Anything that changes something waits for your approval.",
    hint: "Plays on its own: it lists a folder, then waits for approval before moving files.",
    decorative: true,
    visual: <DesktopDemo />,
  },
  {
    id: "tools",
    title: "Reads your PDFs, searches the web, checks your inbox.",
    body: "Point it at a long report, ask it to look something up, or search your email. Sensitive steps wait for you.",
    hint: "Plays on its own: three tools in one request, and Gmail waits for your approval.",
    decorative: true,
    visual: <ToolsDemo />,
  },
  {
    id: "pricing",
    title: "A wallet, not a subscription.",
    body: "Top up from $1. Each message spends only what it costs, and cheaper models cost fewer credits.",
    hint: "Try it: tap a model to send a message and watch the balance.",
    cta: { label: "Start with free credits", href: "/login" },
    decorative: false,
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
