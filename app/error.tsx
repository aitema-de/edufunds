"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home, Mail, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js Error Page
 * Wird automatisch bei Fehlern in der Route gerendert
 */
export default function ErrorPage({ error, reset }: ErrorProps) {
  // Generiere Fehler-ID
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  useEffect(() => {
    // Fehler-Logging
    console.error("Next.js Error Page - Fehler aufgetreten:", {
      errorId,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const getErrorMessage = (error: Error): string => {
    // Benutzerfreundliche Fehlermeldungen basierend auf Fehlertyp
    if (error.message.includes("Network") || error.message.includes("fetch")) {
      return "Verbindungsproblem: Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.";
    }
    if (error.message.includes("timeout") || error.message.includes("Timeout")) {
      return "Zeitüberschreitung: Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.";
    }
    if (error.message.includes("404") || error.message.includes("not found")) {
      return "Die angeforderte Seite oder Ressource wurde nicht gefunden.";
    }
    if (error.message.includes("500") || error.message.includes("Internal Server Error")) {
      return "Server-Fehler: Ein Problem ist aufgetreten. Bitte versuchen Sie es später erneut.";
    }
    if (error.message.includes("permission") || error.message.includes("unauthorized")) {
      return "Zugriffsfehler: Sie haben nicht die nötigen Berechtigungen für diese Aktion.";
    }
    return "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1a1f2e] via-[#0f1419] to-[#1a1f2e]">
      <Card className="max-w-xl w-full border-red-500/20 bg-[#1a1f2e]/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4 animate-pulse">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">
            Oops! Etwas ist schiefgelaufen
          </CardTitle>
          <CardDescription className="text-gray-400 text-base">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Fehler-ID Box */}
          <div className="bg-gradient-to-r from-red-500/5 to-[#c9a227]/5 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Fehler-ID (für Support)</p>
                <code className="text-sm font-mono text-red-400 bg-red-500/10 px-3 py-1.5 rounded">
                  {errorId}
                </code>
              </div>
              <Bug className="w-8 h-8 text-red-500/30" />
            </div>
          </div>

          {/* Entwicklermodus Details */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-gray-900/70 border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
                <span className="text-xs font-medium text-gray-400">DEBUG INFORMATION</span>
              </div>
              <div className="p-4 overflow-auto max-h-48">
                <p className="text-sm font-mono text-red-400 mb-2">{error.message}</p>
                {error.digest && (
                  <p className="text-xs text-gray-500 mb-2">Digest: {error.digest}</p>
                )}
                {error.stack && (
                  <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Hilfe-Accordion */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] mr-2"></span>
              Was können Sie tun?
            </h4>
            <ul className="space-y-2">
              {[
                "Klicken Sie auf \"Erneut versuchen\" um die Seite neu zu laden",
                "Prüfen Sie Ihre Internetverbindung",
                "Leeren Sie den Browser-Cache (Strg+Shift+R)",
                "Versuchen Sie es in einem anderen Browser",
                "Warten Sie kurz und versuchen Sie es später erneut",
              ].map((tip, index) => (
                <li key={index} className="flex items-start text-sm text-gray-400">
                  <span className="text-[#d4a853] mr-2">{index + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={reset}
            className="w-full sm:flex-1 bg-gradient-to-r from-[#d4a853] to-[#c49b4a] hover:from-[#e4b860] hover:to-[#d4ab5a] text-[#0f1419] font-semibold h-11"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Erneut versuchen
          </Button>
          
          <Button
            onClick={handleReload}
            variant="outline"
            className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-11"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Neu laden
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-11"
          >
            <Home className="w-4 h-4 mr-2" />
            Startseite
          </Button>
        </CardFooter>

        {/* Support Footer */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => window.open(`mailto:support@edufunds.de?subject=Fehler%20berichten%20(${errorId})&body=Hallo%20EduFunds-Team,%0A%0Aich%20habe%20einen%20Fehler%20festgestellt:%0A%0AFehler-ID:%20${errorId}%0AFehlermeldung:%20${encodeURIComponent(error.message)}%0A%0ABeschreibung:%20`, "_blank")}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2 border border-dashed border-gray-700 rounded-lg hover:border-gray-500"
          >
            <Mail className="w-4 h-4" />
            Problem weiterhin vorhanden? Support kontaktieren
          </button>
        </div>
      </Card>
    </div>
  );
}
