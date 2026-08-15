type LocalFontOptions = {
  src: Array<{ path: string; weight?: string; style?: string }>;
  variable?: string;
  display?: string;
};

export default function localFont(_options: LocalFontOptions) {
  return {
    className: 'font-euclid',
    variable: '--font-euclid',
    style: {
      fontFamily:
        '"Euclid Circular A", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  };
}
