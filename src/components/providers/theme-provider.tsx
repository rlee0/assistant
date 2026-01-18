"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSettingsStore } from "@/lib/settings/store";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider
 *
 * Integrates next-themes with the settings store.
 * Theme is automatically synced via the forcedTheme prop.
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const theme = useSettingsStore((state) => state.settings.appearance.theme);

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem forcedTheme={theme}>
      {children}
    </NextThemesProvider>
  );
}
