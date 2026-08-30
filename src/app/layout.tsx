import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Oswald,
} from "next/font/google";
import { ThemePref, themePrefScript } from "@/components/theme-pref";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taste Buds",
  description:
    "Blend your Spotify taste with a friend. Get a playlist with a stupid name and an analysis Spotify's own Blend won't show you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={[
        bricolage.variable,
        inter.variable,
        oswald.variable,
        instrumentSerif.variable,
        jetbrainsMono.variable,
        "h-full antialiased",
      ].join(" ")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themePrefScript }} />
      </head>
      <body className="relative z-[1] flex min-h-full flex-col">
        <ThemePref />
        <div className="tb-aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
