import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  // Omit repo-wide stories (missing imports / bad SCSS); workflow studio stories live here.
  stories: ["../src/app/components/workflows/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-onboarding"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    config.resolve = config.resolve ?? {};
    const dedupe = new Set([...(config.resolve.dedupe ?? []), "react", "react-dom"]);
    config.resolve.dedupe = [...dedupe];
    const include = new Set([
      ...((config.optimizeDeps?.include ?? []) as string[]),
      "react-dom/test-utils",
    ]);
    config.optimizeDeps = { ...config.optimizeDeps, include: [...include] };
    return config;
  },
};

export default config;
