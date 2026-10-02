/**
 * Page-load entrance (needs `enter-up` in tailwind.config, see patches).
 * 8px rise + fade, strong ease-out, motion-safe. Not applied to the <h1>:
 * animating opacity on the LCP element delays LCP. Stagger with [animation-delay:Nms].
 */
export const ENTER = "motion-safe:animate-enter-up";

/** Press feedback for anything clickable. Specific properties only, never `transition-all`. */
export const PRESS =
  "active:scale-[0.97] transition-[transform,background-color,opacity] duration-150 ease-out-strong";

/** Buttons carry no borders: primary is a solid inverted pill, secondary is a tonal fill. */
export const BUTTON_PRIMARY =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lp-fg font-medium text-lp-bg hover:opacity-85";
export const BUTTON_TONAL =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lp-tint font-medium text-lp-fg hover:bg-lp-tint-hover";

export type ButtonSize = "sm" | "lg";
export const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

/** The violet-to-magenta of the app icon. Used on the logo mark ONLY, nowhere else on the page. */
export const BRAND_GRADIENT = "bg-gradient-to-br from-violet-600 to-fuchsia-500";

/** Primary button placed on a photo: white on dark imagery in both themes. */
export const BUTTON_ON_IMAGE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white font-medium text-stone-900 hover:opacity-90";

/** Cost calculator inputs. Replace the average with your real median cost per request. */
export const AVG_COST_PER_REQUEST = 0.004;
export const FLAT_PLAN_USD = 20;
export const BREAK_EVEN_REQUESTS = Math.round(FLAT_PLAN_USD / AVG_COST_PER_REQUEST);

export const NAV_LINKS = [
  { href: "#models", label: "Models" },
  { href: "#desktop", label: "Desktop" },
  { href: "#tools", label: "Tools" },
  { href: "#pricing", label: "Pricing" },
] as const;

export const PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "Google",
  "DeepSeek",
  "Meta",
  "Mistral",
  "xAI",
  "Qwen",
] as const;

export const USE_CASES = [
  "Draft client proposals in seconds",
  "Build a website directly on your PC",
  "Update Excel sheets without knowing Excel",
  "Organize project files and folders",
  "Research a topic in depth",
  "Turn messy meeting notes into clear actions",
  "Write and debug code without the headache",
  "Summarize 100-page PDF reports",
  "Find the answer buried in a long PDF",
  "Analyze complex data in plain English",
] as const;

export const FREE_CREDITS = 100;

export const STEPS = [
  {
    id: "open",
    title: "Open the app",
    body: `Download the desktop app or sign in on the web. You start with ${FREE_CREDITS} free credits.`,
  },
  {
    id: "pick",
    title: "Pick a model",
    body: "Choose Claude, GPT, Gemini or any other model, and change your mind on the next message.",
  },
  {
    id: "work",
    title: "Hand it the work",
    body: "Chat, or point it at your files, PDFs and inbox. You only pay for the requests you send.",
  },
] as const;

/** Verify every answer against real product behaviour before launch. */
export const FAQS = [
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "You top up a wallet from $1 in USD or NGN. Each request deducts its own cost, based on the model you picked. There is no monthly plan.",
  },
  {
    id: "models",
    question: "Which models can I use?",
    answer:
      "Claude, GPT, Gemini, DeepSeek, Llama and more, routed through OpenRouter. You can switch models on any message.",
  },
  {
    id: "desktop",
    question: "What can the desktop app access?",
    answer:
      "Your local files and projects, plus commands you approve. Actions that change something wait for your approval first.",
  },
  {
    id: "web",
    question: "Can I use it without installing anything?",
    answer: "Yes. Sign in on the web. The desktop app adds access to your local files and projects.",
  },
  {
    id: "free",
    question: "What do I get when I sign up?",
    answer: `${FREE_CREDITS} free credits to try it, with no subscription to cancel.`,
  },
] as const;
