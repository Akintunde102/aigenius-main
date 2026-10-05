import { Hanken_Grotesk, Newsreader } from "next/font/google";

/**
 * Two voices: a grotesk for UI and body, a serif for headlines. The pairing is the page's own
 * language (editorial headline over product UI) rather than a sans-only SaaS default.
 * If either import fails on your Next version, delete it and use the app font.
 */
export const sans = Hanken_Grotesk({ subsets: ["latin"], display: "swap" });
const display = Newsreader({ subsets: ["latin"], display: "swap" });

export const DISPLAY = display.className;
export const H1 = `${DISPLAY} text-[clamp(2.75rem,7.4vw,5.75rem)] font-normal leading-[0.98] tracking-[-0.035em]`;
export const H2 = `${DISPLAY} text-[clamp(2rem,4.4vw,3.4rem)] font-normal leading-[1.04] tracking-[-0.03em]`;
export const TITLE_SM = `${DISPLAY} text-[clamp(1.5rem,2.5vw,2.25rem)] font-normal leading-[1.1] tracking-[-0.02em]`;
