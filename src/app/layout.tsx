import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Self-hosted fonts (sourced from @fontsource, served locally — no external
// requests at build or runtime).
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    {
      path: "../fonts/inter-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
});

const playfair = localFont({
  variable: "--font-playfair",
  display: "swap",
  src: [
    { path: "../fonts/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/playfair-display-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
});

// Cinzel — a classical Roman serif used for the big display numbers. Its
// numerals sit calmly on the baseline (no oldstyle "dancing" 6/9 like Playfair)
// while still reading as an elegant, related serif.
const cinzel = localFont({
  variable: "--font-cinzel",
  display: "swap",
  src: [
    { path: "../fonts/cinzel-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cinzel-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "WordArchitect — Write. Craft. Conquer.",
  description:
    "WordArchitect is a writing studio for novelists: manage projects, characters, worldbuilding, and outlines with AI at your side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
