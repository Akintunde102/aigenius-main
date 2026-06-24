import localFont from "next/font/local";

/** Long-form chat prose: pairs with UI sans (Euclid) on headers and chrome. */
export const chatReadingFont = localFont({
  src: [
    {
      path: "../../../../../../../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../../../../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
});
