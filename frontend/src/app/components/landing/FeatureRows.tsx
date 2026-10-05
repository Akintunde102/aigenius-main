import { DesktopDemo } from "./DesktopDemo";
import { MeterCalculator } from "./MeterCalculator";
import { ModelSwitcher } from "./ModelSwitcher";
import { Scrollytelling, type FeatureItem } from "./Scrollytelling";
import { ToolsDemo } from "./ToolsDemo";

/** Exactly four items: the pinned layout in Scrollytelling is sized for four. */
const ITEMS: readonly FeatureItem[] = [
  {
    id: "models",
    title: "Switch models in the middle of a conversation.",
    description:
      "Claude for the careful read, GPT for the quick rewrite, Gemini or DeepSeek when they fit better. Everything stays in one thread, and each request is billed at that model's own price.",
    points: [
      "Claude, GPT, Gemini, DeepSeek, Llama and more through OpenRouter",
      "Each request billed at its own model's price",
      "No separate accounts or API keys",
    ],
    decorative: false,
    visual: <ModelSwitcher />,
  },
  {
    id: "desktop",
    title: "Works on your machine. Asks before it acts.",
    description:
      "The desktop app can read your files, run commands and write results back to your project. Each action that changes something waits for your approval first.",
    points: [
      "Direct access to local files, code and projects",
      "Approve or deny each tool call",
      "Gmail and PDF tools alongside local ones",
    ],
    decorative: true,
    visual: <DesktopDemo />,
  },
  {
    id: "tools",
    title: "Reads your PDFs, searches the web, checks your inbox.",
    description:
      "Instead of copying and pasting, point it at a long report, ask it to look something up, or have it go through your email. You see each tool it uses, and anything sensitive waits for your approval.",
    points: [
      "Reads and summarizes long PDF reports",
      "Searches the web for current information",
      "Searches your Gmail, only after you allow it",
    ],
    decorative: true,
    visual: <ToolsDemo />,
  },
  {
    id: "pricing",
    title: "A wallet, not a subscription.",
    description:
      "Slide to see what your month would cost. A flat plan charges the same whether you use it or not; the wallet charges for the requests you actually send.",
    points: ["Top up in USD or NGN", "Free credits when you sign up", "No plan to cancel"],
    decorative: false,
    visual: <MeterCalculator />,
  },
];

export function FeatureRows() {
  return <Scrollytelling items={ITEMS} />;
}
