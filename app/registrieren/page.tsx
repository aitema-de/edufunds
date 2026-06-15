"use client";

import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, School, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function RegistrierenPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    schule: "",
    password: "",
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#f8f5f0" }}>
          <div className="container mx-auto px-6 max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="font-serif text-3xl mb-4" style={{ color: "#0a1628" }}>
                Willkommen bei EduFunds!
              </h1>
              <p className="mb-8" style={{ color: "#475569" }}>
                Ihr Account wurde erfolgreich erstellt. Sie können jetzt alle Förderprogramme 
                durchsuchen und Ihre ersten Anträge erstellen.
              </p>
              <div className="space-y-3">
                <Link
                  href="/foerderprogramme"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gold w-full justify-center"
                >
                  <Sparkles className="w-4 h-4" />
                  Programme entdecken
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#c9a227]/50 text-[#7a5e12] w-full justify-center"
                >
                  Zur Startseite
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#f8f5f0" }}>
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="font-serif text-3xl mb-4" style={{ color: "#0a1628" }}>
                Kostenlos registrieren
              </h1>
              <p style={{ color: "#475569" }}>
                Erstellen Sie Ihren kostenlosen Account und entdecken Sie passende 
                Förderprogramme für Ihre Schule.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl"
              style={{
                backgroundColor: "rgba(15, 31, 56, 0.6)",
                border: "1px solid rgba(201, 162, 39, 0.1)",
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#f8f5f0" }}>
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#64748b" }} />
                    <input
                      type="text"
                      required
                      placeholder="Ihr vollständiger Name"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#050d18] border border-[#1e3a61] text-[#f8f5f0] placeholder:text-[#64748b] focus:border-[#c9a227] focus:outline-none transition-colors"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#f8f5f0" }}>
                    E-Mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#64748b" }} />
                    <input
                      type="email"
                      required
                      placeholder="ihre@email.de"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#050d18] border border-[#1e3a61] text-[#f8f5f0] placeholder:text-[#64748b] focus:border-[#c9a227] focus:outline-none transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Schule */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#f8f5f0" }}>
                    Schule
                  </label>
                  <div className="relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#64748b" }} />
                    <input
                      type="text"
                      required
                      placeholder="Name Ihrer Schule"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#050d18] border border-[#1e3a61] text-[#f8f5f0] placeholder:text-[#64748b] focus:border-[#c9a227] focus:outline-none transition-colors"
                      value={formData.schule}
                      onChange={(e) => setFormData({ ...formData, schule: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#f8f5f0" }}>
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#64748b" }} />
                    <input
                      type="password"
                      required
                      placeholder="Mindestens 8 Zeichen"
                      minLength={8}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#050d18] border border-[#1e3a61] text-[#f8f5f0] placeholder:text-[#64748b] focus:border-[#c9a227] focus:outline-none transition-colors"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-1 w-4 h-4 rounded border-[#1e3a61] bg-[#050d18] text-[#c9a227] focus:ring-[#c9a227]"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                  />
                  <label htmlFor="terms" className="text-sm" style={{ color: "#94a3b8" }}>
                    Ich akzeptiere die{" "}
                    <Link href="/agb" className="text-[#c9a227] hover:underline">
                      AGB
                    </Link>{" "}
                    und die{" "}
                    <Link href="/datenschutz" className="text-[#c9a227] hover:underline">
                      Datenschutzerklärung
                    </Link>
                  </label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  loadingText="Wird erstellt..."
                  className="w-full"
                >
                  Kostenlos registrieren
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>

              {/* Login Link */}
              <p className="mt-6 text-center text-sm" style={{ color: "#94a3b8" }}>
                Bereits registriert?{" "}
                <Link href="/login" className="text-[#c9a227] hover:underline font-medium">
                  Hier anmelden
                </Link>
              </p>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 grid grid-cols-2 gap-4"
            >
              {[
                "Kostenlos für immer",
                "130+ Programme",
                "Sofortiger Zugriff",
                "DSGVO-konform",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
                  <span className="text-sm" style={{ color: "#475569" }}>
                    {benefit}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
