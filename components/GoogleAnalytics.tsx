"use client";

import Script from "next/script";

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
            cookie_expires: 63072000, // 2 Jahre
            cookie_update: false,
            anonymize_ip: true, // DSGVO-konform
          });
        `}
      </Script>
    </>
  );
}

// Event Tracking Helper
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// Conversion Tracking
export function trackConversion(
  transactionId: string,
  value: number,
  currency: string = "EUR"
) {
  trackEvent("purchase", "ecommerce", transactionId, value);
  
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "purchase", {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: [{
        item_name: "EduFunds Produkt",
        item_category: "Digitale Dienstleistung",
      }],
    });
  }
}
