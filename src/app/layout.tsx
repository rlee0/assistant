import "@/styles/globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ErrorBoundary } from "@/components/feedback/error-boundary";
import type { Metadata } from "next";
import { ProgressBarProvider } from "@/components/providers/progress-bar-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Assistant",
  description: "Chatbot experience with Supabase auth, AI gateway models, and configurable tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(geistSans.variable, geistMono.variable, "antialiased")}>
        <ThemeProvider>
          <Suspense fallback={null}>
            <ProgressBarProvider>
              <ErrorBoundary showDetails={process.env.NODE_ENV === "development"}>
                {children}
              </ErrorBoundary>
              <Toaster position="top-center" />
            </ProgressBarProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
