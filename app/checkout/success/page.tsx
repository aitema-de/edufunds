"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/stripe/verify?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setStatus(data.success ? "success" : "error");
        })
        .catch(() => setStatus("error"));
    } else {
      setStatus("success"); // Direkter Zugriff ohne Session
    }
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: "#c9a227" }} />
        <p className="mt-4" style={{ color: "#64748b" }}>Zahlung wird verifiziert...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}>
          <span className="text-4xl">❌</span>
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: "#0a1628" }}>Verifizierung fehlgeschlagen</h1>
        <p className="mb-8" style={{ color: "#64748b" }}>Bitte kontaktieren Sie uns.</p>
        <Link 
          href="/kontakt" 
          className="px-6 py-3 rounded-xl font-semibold inline-block"
          style={{ backgroundColor: "#c9a227", color: "#0a1628" }}
        >
          Kontakt
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div 
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "#22c55e" }} />
      </div>
      <h1 className="text-3xl font-bold mb-4" style={{ color: "#0a1628" }}>Zahlung erfolgreich!</h1>
      <p className="mb-8" style={{ color: "#64748b" }}>Vielen Dank für Ihren Kauf.</p>
      <Link 
        href="/" 
        className="px-6 py-3 rounded-xl font-semibold inline-block"
        style={{ backgroundColor: "#c9a227", color: "#0a1628" }}
      >
        Zur Startseite
      </Link>
    </motion.div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#f8f5f0" }}>
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Suspense fallback={
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: "#c9a227" }} />
                <p className="mt-4" style={{ color: "#64748b" }}>Laden...</p>
              </div>
            }>
              <SuccessContent />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
