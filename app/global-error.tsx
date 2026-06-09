"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fehler an Logging-Service senden
    console.error("Global Error:", error);
    // TODO: Sentry/LogRocket Integration wenn verfügbar
  }, [error]);

  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-950">
        <Header />
        <main className="min-h-[70vh] flex items-center justify-center pt-24 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              {/* Error Icon */}
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>

              {/* Error Code */}
              <div className="text-6xl font-bold text-slate-800 mb-4">
                500
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-[#0a1628] mb-4">
                Ein Fehler ist aufgetreten
              </h1>

              {/* Description */}
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Es tut uns leid, aber etwas ist schiefgelaufen. 
                Unser Team wurde automatisch benachrichtigt.
              </p>

              {/* Error Details (nur in Development) */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-8 p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-left">
                  <p className="text-red-400 text-sm font-mono mb-2">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-slate-500 text-xs">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={reset}>
                  <RefreshCw className="w-5 h-5" />
                  Seite neu laden
                </Button>
                
                <Button asChild variant="outline">
                  <Link href="/">
                    <Home className="w-5 h-5" />
                    Zur Startseite
                  </Link>
                </Button>
                
                <Button asChild variant="outline">
                  <Link href="/kontakt">
                    <MessageCircle className="w-5 h-5" />
                    Support kontaktieren
                  </Link>
                </Button>
              </div>

              {/* Support Info */}
              <div className="mt-12 p-6 rounded-2xl bg-white/50 border border-[#0a1628]/10">
                <p className="text-slate-600 text-sm">
                  Bei wiederkehrenden Problemen erreichen Sie uns unter{" "}
                  <a 
                    href="mailto:office@aitema.de" 
                    className="text-[#c9a227] hover:text-[#e4c55a]"
                  >
                    office@aitema.de
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
