import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Reem_Kufi } from "next/font/google";

/**
 * Typography (NFR-LOC-003), decided in SHL-05:
 * - Body, Arabic: IBM Plex Sans Arabic. Full Arabic coverage incl. tashkeel, open counters that stay legible at
 *   small sizes on phones, and a designed Latin companion (IBM Plex Sans) with identical metrics and rhythm, so a
 *   sentence that mixes "DC-7K3M" or "Ramadan" into Arabic does not jump in weight or x-height.
 * - Display: Reem Kufi. A geometric, slightly playful Kufi with its own Latin, used only for headings, the wordmark
 *   and price numerals. It reads like lettering printed on a game box: warm and confident without being childish.
 * Families are exposed as CSS variables and wired to Tailwind tokens in globals.css (`font-sans`, `font-display`).
 */
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const plexLatin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-latin",
  display: "swap",
});

export const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  variable: "--font-reem-kufi",
  display: "swap",
});

/** Put on <html>: defines the three font variables. */
export const fontVariables = `${plexArabic.variable} ${plexLatin.variable} ${reemKufi.variable}`;
