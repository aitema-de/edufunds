"use client";

import { useState } from "react";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "Bitte bestätigen Sie Ihre Anmeldung über den Link in der E-Mail.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-slate-200 font-medium mb-2">Fast geschafft!</p>
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="email"
          placeholder="ihre@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0f1f38] border border-[#1e3a5f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 transition-all disabled:opacity-50"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={status === "loading" || !email}
        isLoading={status === "loading"}
        loadingText="Wird gesendet..."
      >
        <Send className="h-4 w-4" />
        Abonnieren
      </Button>
      
      {status === "error" && (
        <p className="text-red-400 text-sm sm:absolute sm:-bottom-8 sm:left-0 sm:right-0">
          {message}
        </p>
      )}
    </form>
  );
}

export default NewsletterForm;
