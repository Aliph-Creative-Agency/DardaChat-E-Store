import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Baloo_Bhaijaan_2 } from "next/font/google";

/**
 * Typography (NFR-LOC-003), decided in SHL-05:
 * - Body, Arabic: IBM Plex Sans Arabic. Full Arabic coverage incl. tashkeel, open counters that stay legible at
 *   small sizes on phones, and a designed Latin companion (IBM Plex Sans) with identical metrics and rhythm, so a
 *   sentence that mixes "DC-7K3M" or "Ramadan" into Arabic does not jump in weight or x-height.
 * - Display (BRD-02, DESIGN.md §3): Baloo Bhaijaan 2 (OFL), rounded and playful, Arabic + Latin. It stands in for the
 *   client's Childos Arabic, of which we only hold an unlicensed DEMO: never ship that file. Swap Childos in by
 *   changing this one export (the CSS variable stays `--font-display`). Headings, hero lines, section titles and the
 *   wordmark only: prices, quantities, order numbers and tables always use the body font.
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

export const baloo = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

/** Put on <html>: defines the three font variables. */
export const fontVariables = `${plexArabic.variable} ${plexLatin.variable} ${baloo.variable}`;
