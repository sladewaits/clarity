import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Preferred brand fonts are Söhne / Tiempos, but no licensed font files exist
// in the repo. Per the brand guide's fallback, we use Inter (interface) and
// Source Serif 4 (occasional editorial), loaded via the framework's font
// pipeline (self-hosted, no unlicensed files).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Project Peptides — The operating system for modern specialty care",
    template: "%s · Project Peptides",
  },
  description:
    "The operating system for modern specialty care. One platform for pharmacy connectivity, program operations, education, patient fulfillment, and growth.",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/app-icon.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
