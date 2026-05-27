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
  const { session_token } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8f5f0] pt-24 pb-20">
        <div className="container mx-auto max-w-xl px-4">
          <CheckoutSuccessClient sessionToken={session_token ?? ""} />
        </div>
      </main>
      <Footer />
    </>
  );
}
