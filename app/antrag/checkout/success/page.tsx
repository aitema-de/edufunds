import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckoutSuccessClient } from "@/components/Wizard/CheckoutSuccessClient";

export const metadata: Metadata = {
  title: "Zahlung erfolgt – EduFunds",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ session_token?: string; cs?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  // `cs` = Stripe-Checkout-Session-ID (aus success_url, {CHECKOUT_SESSION_ID}).
  // Wird gebraucht, um bei ausbleibendem Webhook direkt bei Stripe nachzufragen,
  // statt den zahlenden Kunden mit "braucht noch einen Moment" stehenzulassen.
  const { session_token, cs } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfdfc] pt-24 pb-20">
        <div className="container mx-auto max-w-xl px-4">
          <CheckoutSuccessClient sessionToken={session_token ?? ""} checkoutSessionId={cs ?? ""} />
        </div>
      </main>
      <Footer />
    </>
  );
}
