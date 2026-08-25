import "../fonts/desktop-fonts.css";

type LocalFontOptions = {
  src: Array<{ path: string; weight?: string; style?: string }>;
  variable?: string;
  display?: string;
};

const EUCLID_STACK =
  '"Euclid Circular A", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const SERIF_STACK = '"Source Serif 4", Georgia, "Times New Roman", serif';

function isSerifFont(options: LocalFontOptions): boolean {
  return options.src.some(
    (entry) =>
      entry.path.includes("source-serif") || entry.path.toLowerCase().includes("source serif"),
  );
}

/**
 * Vite shim for `next/font/local`: registers @font-face rules via `desktop-fonts.css`
 * and returns class names compatible with the Next.js app.
 */
export default function localFont(options: LocalFontOptions) {
  if (isSerifFont(options)) {
    return {
      className: "font-chat-reading",
      variable: "--font-chat-reading",
      style: {
        fontFamily: SERIF_STACK,
      },
    };
  }

  return {
    className: "font-euclid",
    variable: "--font-euclid",
    style: {
      fontFamily: EUCLID_STACK,
    },
  };
}
