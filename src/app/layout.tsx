import "@/styles/globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ErrorBoundary } from "@/components/feedback/error-boundary";
import type { Metadata } from "next";
import { ProgressBarProvider } from "@/components/providers/progress-bar-provider";
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
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css"
          integrity="sha384-efPmOJxZqckYj7Q/rX4wLRDRdONbTSQxf8CiQCDJGTWUq4M2r/bhuF8qNvTiK+8H"
          crossOrigin="anonymous"
        />
      </head>
      <body className={cn(geistSans.variable, geistMono.variable, "antialiased")}>
        <Suspense fallback={null}>
          <ProgressBarProvider>
            <ErrorBoundary showDetails={process.env.NODE_ENV === "development"}>
              {children}
            </ErrorBoundary>
            <Toaster position="top-center" />
          </ProgressBarProvider>
        </Suspense>
      </body>
    </html>
  );
}
