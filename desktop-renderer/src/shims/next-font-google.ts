import '../fonts/desktop-fonts.css';

type GoogleFontOptions = {
  subsets?: string[];
  display?: string;
  adjustFontFallback?: boolean;
  weight?: string | string[];
  style?: string | string[];
};

function googleFont(className: string, family: string) {
  return (_options: GoogleFontOptions = {}) => ({
    className,
    variable: `--font-${className}`,
    style: {
      fontFamily: family,
    },
  });
}

/** Vite shim for `next/font/google` (landing typography). */
export const Hanken_Grotesk = googleFont(
  'font-hanken-grotesk',
  '"Hanken Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
);

export const Instrument_Sans = googleFont(
  'font-instrument-sans',
  '"Euclid Circular A", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
);

export const Newsreader = googleFont(
  'font-newsreader',
  '"Newsreader", Georgia, "Times New Roman", serif',
);
