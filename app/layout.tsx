import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";

export const metadata: Metadata = {
  title: {
    default: "EduFunds - Intelligente Schulförderung für Schulen",
    template: "%s | EduFunds"
  },
  description: "Finden Sie passende Förderprogramme für Ihre Schule und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung. 130+ Programme im Überblick.",
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
    <html lang="de">
      <head>
        {/* Fonts: DM Serif Display + Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
        />
        <GoogleAnalytics />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: '#f8f5f0' }}
      >
        {/* Global Background Patterns */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(var(--navy-800) 1px, transparent 1px),
                linear-gradient(90deg, var(--navy-800) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              opacity: 0.12
            }}
          />
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(var(--gold-500) 1.5px, transparent 1.5px)`,
              backgroundSize: '24px 24px',
              opacity: 0.08
            }}
          />
        </div>
        <WebVitals />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
// Build Tue Feb 10 08:29:05 PM UTC 2026
