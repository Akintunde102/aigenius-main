import { Hanken_Grotesk, Instrument_Sans } from "next/font/google";

/**
 * Two voices: Hanken Grotesk for UI and body, Instrument Sans for headlines.
 * Instrument Sans is a clean geometric sans-serif with tight tracking at display
 * sizes — the same family as Cursor and Linear. Close to Hanken Grotesk but with
 * more personality at large sizes.
 */
export const sans = Hanken_Grotesk({ subsets: ["latin"], display: "swap" });
const display = Instrument_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"] });

export const DISPLAY = display.className;
export const H1 = `${DISPLAY} text-[clamp(2.75rem,7.4vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.04em]`;
export const H2 = `${DISPLAY} text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.03em]`;
export const TITLE_SM = `${DISPLAY} text-[clamp(1.5rem,2.5vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.02em]`;

