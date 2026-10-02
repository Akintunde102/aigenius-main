import type { Metadata } from "next";

const TITLE = "AIGenius: every frontier model, one workspace, no subscription";
const DESCRIPTION =
  "Use Claude, GPT and Gemini from one desktop and web app, with direct access to your files. Top up a wallet from $1 and pay only for the requests you send.";

/**
 * Spread into the metadata export of the layout that renders the landing page:
 *   export const metadata = landingMetadata;
 * Add `openGraph.images` once you have a 1200x630 share image. Without one, links preview as plain text.
 */
export const landingMetadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "AIGenius" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
