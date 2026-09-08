import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Project Peptides — The Operating System for Modern Longevity Medicine",
    template: "%s · Project Peptides",
  },
  description:
    "One platform for pharmacy connectivity, program operations, education, patient fulfillment, and growth. Built for modern cash-pay medical practices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
