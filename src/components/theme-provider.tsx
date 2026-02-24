// components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class" // this ensures "dark" or "light" classes get applied to <html>
      defaultTheme="system"
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
