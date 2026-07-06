import type { Metadata } from "next";
import { headers } from "next/headers";
import { Newsreader, Outfit, Fira_Code, Bricolage_Grotesque, Caveat } from "next/font/google";
import "./globals.css";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

/* Editorial Archival — Refresh-Fonts (Welle 0).
 * Newsreader (Serif, inkl. italic fuer Akzentwoerter) ersetzt DM Serif Display,
 * Outfit (Sans) ersetzt Plus Jakarta Sans, Fira Code (Mono) bleibt.
 * Self-hosted via next/font → kein Render-Blocking, kein externer Request. */
const fontSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const fontSans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const fontMono = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
/* Landing-Handoff Variante 1c: Bricolage Grotesque nur fuer die Hero-Headline,
 * Caveat fuer die Handschrift-Vornamen der Gruender-Sektion. */
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
const fontHand = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-hand",
  display: "swap",
});
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import { FeedbackButton } from "@/components/FeedbackButton";

export const metadata: Metadata = {
  title: {
    default: "EduFunds - Intelligente Schulförderung für Schulen",
    template: "%s | EduFunds"
  },
  description: `Finden Sie passende Förderprogramme für Ihre Schule und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung. ${PROGRAMM_COUNT_LABEL} Programme im Überblick.`,
  keywords: ["Schulförderung", "Fördermittel", "Schule", "Anträge", "KI", "Bildung", "Grundschule", "Förderprogramme"],
  authors: [{ name: "EduFunds" }],
  creator: "EduFunds",
  publisher: "EduFunds",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://edufunds.org',
    siteName: 'EduFunds',
    title: 'EduFunds - Intelligente Schulförderung',
    description: 'Finden Sie passende Förderprogramme für Ihre Schule und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung.',
    images: [
      {
        url: 'https://edufunds.org/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduFunds - Schulförderung leicht gemacht',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduFunds - Intelligente Schulförderung',
    description: 'Finden Sie passende Förderprogramme für Ihre Schule und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung.',
    images: ['https://edufunds.org/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code', // TODO: Ersetzen wenn verfügbar
  },
  alternates: {
    canonical: 'https://edufunds.org',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP-Nonce für das manuelle JSON-LD-Script (von middleware.ts gesetzt).
  // Nexts eigene Scripts + next/script (GA) werden automatisch genonct.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // Schema.org Structured Data
  const schemaOrgData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EduFunds',
    url: 'https://edufunds.org',
    logo: 'https://edufunds.org/logo.png',
    description: 'Intelligente Schulförderung mit KI-Unterstützung',
    sameAs: [
      // TODO: Social Media Profile hinzufügen wenn verfügbar
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'office@aitema.de',
      contactType: 'customer service',
      availableLanguage: ['German'],
    },
    offers: {
      '@type': 'Offer',
      name: 'EduFunds Einzelantrag',
      price: '29.90',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <html lang="de" className={`${fontSerif.variable} ${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontHand.variable}`}>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
        />
        <GoogleAnalytics />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: '#fdfdfc' }}
      >
        {/* Global Background Patterns — Editorial-Archival Paper-Canvas */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(#1c1917 1px, transparent 1px),
                linear-gradient(90deg, #1c1917 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              opacity: 0.12
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(#1e3d32 1.5px, transparent 1.5px)`,
              backgroundSize: '24px 24px',
              opacity: 0.08
            }}
          />
        </div>
        <WebVitals />
        <div className="relative z-10">
          {children}
        </div>
        {/* Globaler Pilot-Feedback-Button — schwebt auf JEDER Seite (inkl. 404),
            damit Tester von ueberall Bugs/Ideen melden koennen. Erfasst die
            aktuelle URL als Kontext. */}
        <FeedbackButton />
      </body>
    </html>
  );
}
// Build Tue Feb 10 08:29:05 PM UTC 2026
