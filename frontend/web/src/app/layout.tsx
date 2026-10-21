import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = "Bet your AniCoins on what happens next in your favorite anime and manga. Free to play: daily trivia, weekly puzzles and prediction markets."

export const metadata: Metadata = {
  // Base des URLs absolues des aperçus (og:image…) : à définir en prod.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "aniBet — Anime & Manga Predictions",
  description,
  openGraph: { title: "aniBet — Anime & Manga Predictions", description, siteName: "aniBet", type: "website" },
  twitter: { card: "summary_large_image" },
};

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}