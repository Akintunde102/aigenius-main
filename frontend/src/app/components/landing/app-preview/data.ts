/* All conversations are illustrative demo content, not real user data. */

export interface Segment {
  readonly text: string;
  readonly bold?: boolean;
}

export type Block =
  | { readonly type: "heading"; readonly level: 1 | 2; readonly text: string }
  | { readonly type: "paragraph"; readonly segments: readonly Segment[] }
  | { readonly type: "list"; readonly items: readonly (readonly Segment[])[] }
  | { readonly type: "thought"; readonly text: string }
  | {
      readonly type: "tool";
      readonly label: string;
      readonly status?: string;
      readonly check?: boolean;
      readonly detail?: string;
    }
  | { readonly type: "table"; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] };

export type Message =
  | { readonly id: string; readonly role: "user"; readonly text: string; readonly ago?: string }
  | { readonly id: string; readonly role: "assistant"; readonly model: ModelName; readonly blocks: readonly Block[] };

export interface Chat {
  readonly id: string;
  readonly title: string;
  /** Short relative time shown at the right of the sidebar row, for example "22m" or "3d". */
  readonly age: string;
  readonly messages: readonly Message[];
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly chatIds: readonly string[];
  /** Older chats not shown, rendered as "Open more (n)". */
  readonly moreCount?: number;
}

export const MODELS = ["Claude", "GPT", "Gemini", "DeepSeek"] as const;
export type ModelName = (typeof MODELS)[number];

export const NEW_CHAT_TITLE = "New chat";

const t = (text: string): Segment => ({ text });
const b = (text: string): Segment => ({ text, bold: true });
const h1 = (text: string): Block => ({ type: "heading", level: 1, text });
const h2 = (text: string): Block => ({ type: "heading", level: 2, text });
const paragraph = (...segments: Segment[]): Block => ({ type: "paragraph", segments });
const list = (...items: Segment[][]): Block => ({ type: "list", items });

export const INITIAL_CHATS: readonly Chat[] = [
  {
    id: "folder-analysis",
    title: "Project folder analysis",
    age: "22m",
    messages: [
      { id: "fa-1", role: "user", text: "Analyse my project folders using parallel subagents", ago: "22 minutes ago" },
      {
        id: "fa-2",
        role: "assistant",
        model: "Claude",
        blocks: [
          {
            type: "thought",
            text: "List the folder first, then split the analysis across subagents so each one reads a few folders in parallel. Everything stays read-only.",
          },
          paragraph(
            t("I'll start by exploring your Projects folder to see what exists, then spin up parallel subagents to analyse each one."),
          ),
          {
            type: "tool",
            label: "Listed Projects",
            detail: "api-gateway/\nmarketing-site/\ninvoices-2025/\nmobile-app/\nnotes/\nold-experiments/\n... 17 more",
          },
          paragraph(t("Let me get a clean list of just the folders so I can delegate the analysis in parallel.")),
          { type: "tool", label: "local_shell", status: "done", detail: "$ ls -d */ | wc -l\n23" },
          paragraph(
            t("Your Projects folder has "),
            b("23 folders"),
            t(". I'll launch 6 parallel subagents, each analysing about 4 folders, then combine their findings."),
          ),
          { type: "tool", label: "6 subagent", check: true, detail: "6 of 6 finished. Read-only: no files were changed." },
          paragraph(t("All 6 subagents finished (23 folders analysed, read-only). Here is the combined analysis.")),
          h1("Project Folder Analysis — 23 folders"),
          h2("Snapshot"),
          {
            type: "table",
            headers: ["Category", "Folders", "Verdict"],
            rows: [
              ["Active code projects", "10", "Keep"],
              ["Finished projects", "4", "Archive when confirmed"],
              ["Documents, notes and media", "5", "Tidy or archive"],
              ["Empty folders", "3", "Delete"],
              ["Dormant one-offs", "1", "Archive"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "acme-proposal",
    title: "Acme proposal draft",
    age: "3d",
    messages: [
      { id: "ac-1", role: "user", text: "Draft a one-page proposal for Acme Labs.", ago: "3 days ago" },
      {
        id: "ac-2",
        role: "assistant",
        model: "Claude",
        blocks: [
          h2("Overview"),
          paragraph(t("A six-week engagement to redesign the onboarding experience and measure the lift.")),
          h2("Scope"),
          list([t("Research and audit, weeks 1 to 2.")], [t("Design and prototype, weeks 3 to 4.")], [t("Build and measure, weeks 5 to 6.")]),
        ],
      },
    ],
  },
  {
    id: "vendor-contract",
    title: "Vendor contract review",
    age: "3d",
    messages: [
      { id: "vc-1", role: "user", text: "Summarize the vendor contract and flag anything risky.", ago: "3 days ago" },
      {
        id: "vc-2",
        role: "assistant",
        model: "Claude",
        blocks: [
          { type: "tool", label: "read_file", status: "done", detail: "./contracts/vendor-agreement.pdf" },
          h2("Summary"),
          paragraph(t("A 24-month services agreement with standard payment terms and a fairly standard scope of work.")),
          h2("Risky clauses"),
          list(
            [b("Clause 7.2:"), t(" the vendor can change pricing on 14 days notice.")],
            [b("Clause 11.4:"), t(" auto-renews for 12 months unless you cancel 60 days before the end.")],
            [b("Clause 14:"), t(" liability is capped at one month of fees.")],
          ),
          paragraph(t("Suggested next step: ask for "), b("90 days notice"), t(" on price changes and a 30-day cancellation window.")),
        ],
      },
      { id: "vc-3", role: "user", text: "Rewrite 7.2 so it needs 90 days.", ago: "3 days ago" },
      {
        id: "vc-4",
        role: "assistant",
        model: "GPT",
        blocks: [paragraph(t("The vendor may change pricing only after giving the customer at least 90 days written notice."))],
      },
    ],
  },
  {
    id: "q3-report",
    title: "Q3 report summary",
    age: "2d",
    messages: [
      { id: "q3-1", role: "user", text: "Summarize the Q3 report in four bullets.", ago: "2 days ago" },
      {
        id: "q3-2",
        role: "assistant",
        model: "Gemini",
        blocks: [
          list(
            [b("Growth:"), t(" revenue up on the previous quarter, led by existing customers.")],
            [b("Costs:"), t(" infrastructure spend flat despite higher usage.")],
            [b("Risk:"), t(" two large accounts are up for renewal in Q4.")],
            [b("Decision needed:"), t(" approve the Q4 hiring plan.")],
          ),
        ],
      },
    ],
  },
  {
    id: "invoice-digest",
    title: "Overdue invoices",
    age: "5d",
    messages: [
      { id: "iv-1", role: "user", text: "Which invoices are overdue?", ago: "5 days ago" },
      {
        id: "iv-2",
        role: "assistant",
        model: "DeepSeek",
        blocks: [
          h2("Overdue"),
          list([b("INV-4021"), t(", Cloudflare, 12 days past due.")], [b("INV-4033"), t(", Notion, 5 days past due.")]),
          paragraph(t("Everything else is due in the next 14 days.")),
        ],
      },
    ],
  },
  {
    id: "landing-copy",
    title: "Pricing page headline",
    age: "3d",
    messages: [
      { id: "lc-1", role: "user", text: "Write three headlines for our pricing page.", ago: "3 days ago" },
      {
        id: "lc-2",
        role: "assistant",
        model: "GPT",
        blocks: [list([t("Pay for the work, not the month.")], [t("Start at $1. Stop whenever.")], [t("Every model. One wallet.")])],
      },
    ],
  },
  {
    id: "seo-audit",
    title: "SEO audit checklist",
    age: "21d",
    messages: [
      { id: "se-1", role: "user", text: "Give me a short SEO checklist for a landing page.", ago: "21 days ago" },
      {
        id: "se-2",
        role: "assistant",
        model: "Claude",
        blocks: [
          list(
            [b("One h1"), t(" that says what the product does.")],
            [b("Fast first paint:"), t(" preload the hero image, keep scripts small.")],
            [b("Metadata:"), t(" a clear title, description and share image.")],
          ),
        ],
      },
    ],
  },
  {
    id: "competitor-pricing",
    title: "Competitor pricing",
    age: "2mo",
    messages: [
      { id: "cp-1", role: "user", text: "What do the main competitors charge?", ago: "2 months ago" },
      {
        id: "cp-2",
        role: "assistant",
        model: "Gemini",
        blocks: [
          paragraph(
            t("Most charge a flat monthly plan. I would check each live pricing page before quoting numbers, since they change often."),
          ),
        ],
      },
    ],
  },
  {
    id: "weekly-report",
    title: "Weekly report from notes",
    age: "1mo",
    messages: [
      { id: "wr-1", role: "user", text: "Turn these meeting notes into a weekly report.", ago: "1 month ago" },
      {
        id: "wr-2",
        role: "assistant",
        model: "Claude",
        blocks: [
          h2("Highlights"),
          list([t("Onboarding flow shipped to all users.")], [t("Support response time down for the third week.")]),
          h2("Blockers"),
          list([t("Waiting on legal sign-off for the new vendor terms.")]),
          h2("Next week"),
          list([t("Start the billing dashboard.")], [t("Review the Q4 budget with finance.")]),
        ],
      },
    ],
  },
];

export const INITIAL_PROJECTS: readonly Project[] = [
  { id: "job", name: "Job", chatIds: ["folder-analysis"] },
  { id: "client-work", name: "Client work", chatIds: ["acme-proposal", "vendor-contract"], moreCount: 4 },
  { id: "finance", name: "Finance", chatIds: ["q3-report", "invoice-digest"] },
  { id: "website", name: "Website", chatIds: ["landing-copy", "seo-audit"], moreCount: 2 },
  { id: "research", name: "Research", chatIds: ["competitor-pricing"] },
  { id: "general", name: "General", chatIds: ["weekly-report"] },
];

export const INITIAL_OPEN_PROJECT_IDS: readonly string[] = ["job", "client-work", "finance"];
export const DEFAULT_PROJECT_ID = "job";
export const DEFAULT_CHAT_ID = "folder-analysis";

export const SUGGESTIONS = [
  "Summarize this contract and flag anything risky",
  "Draft a proposal for a new client",
  "What do my competitors charge?",
  "Which invoices are overdue?",
] as const;

const REPLIES: readonly { readonly keywords: readonly string[]; readonly text: string }[] = [
  {
    keywords: ["contract", "clause", "legal", "risky"],
    text: "Start with the clauses that change what you pay or how you exit: price changes, auto-renewal and liability caps. I would flag those first, then propose exact wording for each.",
  },
  {
    keywords: ["folder", "files", "desktop", "analyse", "analyze"],
    text: "I can look through that folder read-only, group what is in it and suggest what to keep, archive or delete. Anything that changes a file waits for your approval first.",
  },
  {
    keywords: ["summar", "report", "notes"],
    text: "Here is the short version: the main points first, then the decisions that need you, then anything that can wait. In the real app I would read your actual file and show where each point came from.",
  },
  {
    keywords: ["email", "gmail", "inbox"],
    text: "I can search your inbox for that, but I would ask for your approval first. Nothing touches your email until you allow it.",
  },
  {
    keywords: ["price", "pricing", "cost", "wallet", "pay", "charge"],
    text: "You top up a wallet from $1 and each request deducts its own cost, so there is no monthly plan to cancel.",
  },
];

/** Scripted reply for the preview. Picks by keyword, else a friendly default naming the chosen model. */
export function pickReply(input: string, model: ModelName): string {
  const lower = input.toLowerCase();
  const match = REPLIES.find((reply) => reply.keywords.some((keyword) => lower.includes(keyword)));
  if (match) return match.text;
  return `Here is how I would approach that. This preview is scripted, but in the real app ${model} would answer here using your own files and tools. Download AIGenius to try it with your real work.`;
}
