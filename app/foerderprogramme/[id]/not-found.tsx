import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Search, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="h-12 w-12 text-slate-500" />
            </div>

            {/* Status Code */}
            <div className="text-8xl font-bold text-slate-700 mb-4">404</div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#1c1917] mb-4">
              Förderprogramm nicht gefunden
            </h1>

            {/* Description */}
            <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
              Das gesuchte Förderprogramm existiert nicht oder wurde entfernt. 
              Vielleicht finden Sie ein passendes Programm in unserer Übersicht.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/foerderprogramme"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl btn-primary text-base font-semibold"
              >
                <ArrowLeft className="h-5 w-5" />
                Zurück zur Übersicht
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl btn-outline text-base font-medium"
              >
                <Search className="h-5 w-5" />
                Startseite
              </Link>
            </div>

            {/* Additional Help */}
            <div className="mt-12 p-6 glass rounded-2xl">
              <h2 className="text-lg font-semibold text-[#57534e] mb-2">
                Benötigen Sie Hilfe?
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Unser Team hilft Ihnen gerne bei der Suche nach dem richtigen Förderprogramm.
              </p>
              <Link
                href="/kontakt"
                className="text-[#78350f] hover:text-[#d97706] transition-colors text-sm font-medium"
              >
                Kontaktieren Sie uns →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
