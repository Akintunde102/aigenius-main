import { Inter, Inter_Tight } from "next/font/google";

/**
 * Inter for UI and body, Inter Tight for headlines.
 * Linear sets its site in Inter. Cursor uses its own custom typeface, which is proprietary and
 * cannot be used here, so Inter Tight is the nearest open match for that look: the same letterforms
 * as Inter, drawn tighter for large sizes. Both are free and served by next/font with no layout shift.
 * If the CEO wants a different feel, Geist is a one-line swap for `display`
 * (import { Geist } from "next/font/google").
 */
export const sans = Inter({ subsets: ["latin"], display: "swap" });
const display = Inter_Tight({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"] });

export const DISPLAY = display.className;
export const H1 = `${DISPLAY} text-[clamp(2.75rem,7.4vw,5.75rem)] font-medium leading-[0.98] tracking-[-0.04em]`;
export const H2 = `${DISPLAY} text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.03em]`;
export const TITLE_SM = `${DISPLAY} text-[clamp(1.5rem,2.5vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.02em]`;