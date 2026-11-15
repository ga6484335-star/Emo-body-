import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EMO VIRTUAL BODY — Interactive Self-Extending ESP32 Robot Simulator",
  description:
    "Virtual hardware simulator for EMO-style ESP32/Arduino desktop robots. Import your own firmware, analyse AST capabilities, extend virtual hardware modules, and run real 128x64 SSD1306 OLED simulations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#06080D",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#06080D] text-[#F1F5F9] font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
