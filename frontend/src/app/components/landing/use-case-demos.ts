import type { Block, ModelName, Segment } from "./app-preview/data";

/* Illustrative demo conversations, one per use case. Not real user data. */

export interface UseCaseDemoData {
    readonly id: string;
    readonly title: string;
    readonly prompt: string;
    readonly model: ModelName;
    readonly credits: number;
    readonly calls: number;
    readonly blocks: readonly Block[];
}

const t = (text: string): Segment => ({ text });
const b = (text: string): Segment => ({ text, bold: true });
const h = (text: string): Block => ({ type: "heading", level: 2, text });
const p = (...segments: Segment[]): Block => ({ type: "paragraph", segments });
const ul = (...items: Segment[][]): Block => ({ type: "list", items });
const tool = (label: string, detail: string, status = "done"): Block => ({ type: "tool", label, status, detail });

export const USE_CASE_DEMOS: readonly UseCaseDemoData[] = [
    {
        id: "proposals",
        title: "Draft client proposals in seconds",
        prompt: "Draft a one-page proposal for Acme Labs: a six-week onboarding redesign.",
        model: "Claude",
        credits: 9,
        calls: 1,
        blocks: [
            h("Overview"),
            p(t("A six-week engagement to redesign Acme's onboarding and measure the lift in activation.")),
            h("Scope"),
            ul([t("Weeks 1 to 2: research and audit.")], [t("Weeks 3 to 4: design and prototype.")], [t("Weeks 5 to 6: build and measure.")]),
            p(t("Want a price table and terms added? I can match the format of your last proposal.")),
        ],
    },
    {
        id: "website",
        title: "Build a website directly on your PC",
        prompt: "Build a simple landing page for my bakery and save it to my Desktop.",
        model: "Claude",
        credits: 14,
        calls: 3,
        blocks: [
            tool("write_file", "~/Desktop/bakery/index.html", "approved"),
            tool("write_file", "~/Desktop/bakery/styles.css", "approved"),
            p(t("Done. Open "), b("index.html"), t(" in your browser to see it. Each file waited for your approval before it was written.")),
            p(t("Next I can add a menu page and an order form.")),
        ],
    },
    {
        id: "excel",
        title: "Update Excel sheets without knowing Excel",
        prompt: "In budget.xlsx, add a column that totals each row and highlight anything over $5,000.",
        model: "GPT",
        credits: 7,
        calls: 2,
        blocks: [
            tool("read_file", "budget.xlsx · 3 sheets"),
            ul([t("Added a "), b("Total"), t(" column to every row.")], [t("Highlighted 4 rows over $5,000.")]),
            p(t("Saved as "), b("budget-updated.xlsx"), t(" so your original file is untouched.")),
        ],
    },
    {
        id: "organize",
        title: "Organize project files and folders",
        prompt: "Sort my Downloads folder into folders by type.",
        model: "Gemini",
        credits: 4,
        calls: 2,
        blocks: [
            tool("Listed Downloads", "142 files"),
            h("Plan"),
            {
                type: "table",
                headers: ["Folder", "Files"],
                rows: [
                    ["Documents", "48"],
                    ["Images", "37"],
                    ["Installers", "12"],
                    ["Archives", "9"],
                    ["Other", "36"],
                ],
            },
            p(t("Nothing moves until you approve this plan.")),
        ],
    },
    {
        id: "research",
        title: "Research a topic in depth",
        prompt: "Compare the main ways to build an offline-first mobile app.",
        model: "Claude",
        credits: 11,
        calls: 1,
        blocks: [
            h("Summary"),
            ul(
                [b("Local database with sync:"), t(" best control, most work to get conflict handling right.")],
                [b("A sync framework:"), t(" faster to ship, ties you to its data model.")],
                [b("Cache and queue:"), t(" simplest, only good for mostly-read apps.")],
            ),
            p(t("For most teams I would start with the sync framework and move to a local database only if you outgrow it.")),
        ],
    },
    {
        id: "notes",
        title: "Turn messy meeting notes into clear actions",
        prompt: "Turn these notes into decisions and action items with owners.",
        model: "GPT",
        credits: 5,
        calls: 1,
        blocks: [
            h("Decisions"),
            ul([t("Launch moves to the first week of November.")], [t("Pricing page ships before the launch.")]),
            h("Action items"),
            ul([b("Ada:"), t(" final pricing copy, Friday.")], [b("Tunde:"), t(" QA the signup flow, Monday.")], [b("Ngozi:"), t(" book the launch call, this week.")]),
        ],
    },
    {
        id: "code",
        title: "Write and debug code without the headache",
        prompt: "This function returns undefined for an empty array. Can you fix it?",
        model: "DeepSeek",
        credits: 2,
        calls: 2,
        blocks: [
            p(t("The function reads "), b("arr[0]"), t(" without checking the length, so an empty array gives "), b("undefined"), t(".")),
            tool("Edited utils/first.ts", "- return arr[0];\n+ return arr.length > 0 ? arr[0] : null;"),
            p(t("Fixed. It now returns "), b("null"), t(" for an empty array. I can add a test for that case too.")),
        ],
    },
    {
        id: "pdf-summary",
        title: "Summarize 100-page PDF reports",
        prompt: "Summarize annual-report.pdf in five bullets.",
        model: "Claude",
        credits: 12,
        calls: 2,
        blocks: [
            tool("read_file", "annual-report.pdf · 104 pages"),
            ul(
                [b("Revenue"), t(" grew steadily, led by existing customers.")],
                [b("Margins"), t(" held flat despite higher costs.")],
                [b("Hiring"), t(" doubled in engineering.")],
                [b("Risk:"), t(" two customers make up a large share of sales.")],
                [b("Outlook:"), t(" guidance is cautious for the next two quarters.")],
            ),
        ],
    },
    {
        id: "pdf-answer",
        title: "Find the answer buried in a long PDF",
        prompt: "In contract.pdf, how much notice do I need to give to cancel?",
        model: "Gemini",
        credits: 3,
        calls: 2,
        blocks: [
            tool("read_file", "contract.pdf · 62 pages"),
            p(b("60 days written notice"), t(" before the renewal date, in section 11.4 on page 38.")),
            p(t("Miss that window and it renews for another 12 months.")),
        ],
    },
    {
        id: "data",
        title: "Analyze complex data in plain English",
        prompt: "Which month had the biggest drop in sales, and what changed?",
        model: "GPT",
        credits: 6,
        calls: 2,
        blocks: [
            tool("read_file", "sales-2026.csv · 1,240 rows"),
            {
                type: "table",
                headers: ["Month", "Sales", "Change"],
                rows: [
                    ["May", "$48k", "+3%"],
                    ["June", "$39k", "-19%"],
                    ["July", "$41k", "+5%"],
                ],
            },
            p(t("June fell the most. Most of the drop came from one product line that went out of stock for two weeks.")),
        ],
    },
];