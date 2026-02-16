import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduFunds - Intelligente Schulförderung für Schulen",
    template: "%s | EduFunds"
  },
  description: "Finden Sie passende Förderprogramme für Ihre Schule und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung. 120 Programme im Überblick.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      price: '29.00',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <html lang="de" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
        />
        <GoogleAnalytics />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
// Build Tue Feb 10 08:29:05 PM UTC 2026
