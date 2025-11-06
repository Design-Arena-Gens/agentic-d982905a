import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShortForge AI",
  description: "Agent that curates viral scripts and renders YouTube Shorts-ready videos with AI voiceover."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
