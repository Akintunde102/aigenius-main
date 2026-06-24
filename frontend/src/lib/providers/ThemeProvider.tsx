"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ColorMode, COLOR_MODE_STORAGE_KEY } from "@/lib/color-mode";

interface ThemeContextType {
  theme: ColorMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ColorMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode | null;
    const initialTheme: ColorMode = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (currentTheme: ColorMode) => {
      let resolved: "light" | "dark" = "dark";

      if (currentTheme === "system") {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        resolved = media.matches ? "dark" : "light";
      } else {
        resolved = currentTheme;
      }

      setResolvedTheme(resolved);

      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme(theme);

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        const rootNode = document.documentElement;
        rootNode.classList.add("theme-transitioning");
        
        const resolved = e.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        if (resolved === "dark") {
          rootNode.classList.add("dark");
        } else {
          rootNode.classList.remove("dark");
        }

        setTimeout(() => {
          rootNode.classList.remove("theme-transitioning");
        }, 300);
      };

      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme]);

  const setTheme = (newTheme: ColorMode) => {
    const root = document.documentElement;
    root.classList.add("theme-transitioning");

    setThemeState(newTheme);
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, newTheme);
    } catch {
      /* ignore */
    }

    setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 300);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
