"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, FileText, RefreshCw, Download, Wand2, FileDown } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { generateAntrag, type ProjektDaten } from "@/lib/ki-antrag-generator";

// Dynamischer Import für html2pdf (nur im Browser)
const loadHtml2pdf = async () => {
  const html2pdf = (await import("html2pdf.js")).default;
  return html2pdf;
};

interface KIAntragAssistentProps {
  programm: Foerderprogramm;
  onClose?: () => void;
}

export function KIAntragAssistent({ programm, onClose }: KIAntragAssistentProps) {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [projektDaten, setProjektDaten] = useState<ProjektDaten>({
    schulname: "",
    projekttitel: "",
    kurzbeschreibung: "",
    ziele: "",
    zielgruppe: "",
    zeitraum: "",
    hauptaktivitaeten: "",
    ergebnisse: "",
    nachhaltigkeit: "",
    foerderbetrag: programm.foerdersummeMin?.toString() || "10000",
  });
  const [generatedText, setGeneratedText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof ProjektDaten, value: string) => {
    setProjektDaten((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    
    try {
      const antrag = await generateAntrag(programm, projektDaten);
      setGeneratedText(antrag);
      setStep("result");
    } catch (err) {
      setError("Fehler bei der Antragsgenerierung. Bitte versuchen Sie es erneut.");
      setStep("form");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsTxt = () => {
    const blob = new Blob([generatedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Foerderantrag_${projektDaten.projekttitel.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsDoc = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Förderantrag</title></head>
      <body>${generatedText.replace(/\n/g, '<br>')}</body>
      </html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Foerderantrag_${projektDaten.projekttitel.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resultRef = useRef<HTMLDivElement>(null);

  const downloadAsPDF = async () => {
    if (!resultRef.current) return;
    
    const element = resultRef.current;
    const opt = {
      margin: [20, 20, 20, 20],
      filename: `Foerderantrag_${projektDaten.projekttitel.replace(/\s+/g, "_")}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    } as any;

    try {
      const html2pdf = await loadHtml2pdf();
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF konnte nicht generiert werden. Bitte versuchen Sie es erneut.');
    }
  };

  const isFormValid = () => {
    return (
      projektDaten.schulname.length > 2 &&
      projektDaten.projekttitel.length > 3 &&
      projektDaten.kurzbeschreibung.length > 20 &&
      projektDaten.ziele.length > 10 &&
      projektDaten.hauptaktivitaeten.length > 10
    );
  };

  // Generierung läuft
  if (step === "generating") {
    return (
      <Card className="w-full max-w-2xl mx-auto border-orange-500/30">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="h-16 w-16 text-orange-400 animate-spin relative" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-slate-100">
                KI generiert Ihren Antrag...
              </h3>
              <p className="text-slate-400 max-w-md">
                Die KI analysiert das Programm „{programm.name}" und erstellt einen maßgeschneiderten Antrag basierend auf Ihren Projektdaten.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4" />
              <span>Programmspezifische Templates</span>
              <span className="mx-2">•</span>
              <span>Optimierte Antragssprache</span>
              <span className="mx-2">•</span>
              <span>{programm.foerdergeberTyp === "bund" ? "Bundesförderung" : 
                     programm.foerdergeberTyp === "land" ? "Landesförderung" :
                     programm.foerdergeberTyp === "stiftung" ? "Stiftungsförderung" :
                     programm.foerdergeberTyp === "eu" ? "EU-Förderung" : "Förderprogramm"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ergebnis anzeigen
  if (step === "result") {
    return (
      <Card className="w-full max-w-4xl mx-auto border-orange-500/30">
        <CardHeader className="border-b border-slate-700/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100">Antrag generiert!</CardTitle>
                <CardDescription className="text-slate-400">
                  Basierend auf „{programm.name}"
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("form")}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Neu generieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopiert!" : "Kopieren"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsDoc}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Word
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsTxt}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Text
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={downloadAsPDF}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div ref={resultRef} className="bg-slate-900/50 rounded-lg p-6 font-mono text-sm text-slate-300 whitespace-pre-wrap border border-slate-700/50 max-h-[600px] overflow-y-auto">
            {generatedText}
          </div>
          
          <div className="mt-6 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-orange-400 mt-0.5" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-orange-400 mb-1">KI-Hinweise</p>
                <p>
                  Dieser Antrag wurde automatisch generiert und ist an die spezifischen Anforderungen 
                  {programm.foerdergeberTyp === "bund" ? " einer Bundesförderung" : 
                   programm.foerdergeberTyp === "land" ? " einer Landesförderung" :
                   programm.foerdergeberTyp === "stiftung" ? " einer Stiftungsförderung" :
                   programm.foerdergeberTyp === "eu" ? " einer EU-Förderung" : " des Förderprogramms"} 
                  angepasst. Überprüfen Sie den Text und passen Sie ihn an Ihre spezifischen Bedürfnisse an. 
                  Beachten Sie die offiziellen Antragsrichtlinien von {programm.foerdergeber}.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formular anzeigen
  return (
    <Card className="w-full max-w-2xl mx-auto border-orange-500/30">
      <CardHeader className="border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Wand2 className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-slate-100">KI-Antragsassistent</CardTitle>
            <CardDescription className="text-slate-400">
              Generieren Sie einen professionellen Antrag für „{programm.name}"
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Programm Info */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-orange-400" />
            <span className="font-medium text-slate-200">Förderprogramm</span>
          </div>
          <p className="text-sm text-slate-400 mb-2">{programm.name}</p>
          <div className="flex flex-wrap gap-2">
            {programm.kategorien.slice(0, 4).map((kategorie) => (
              <Badge key={kategorie} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                {kategorie.replace(/-/g, " ")}
              </Badge>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Fördergeber: {programm.foerdergeber} ({programm.foerdergeberTyp})
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Formular */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schulname" className="text-slate-300">
                Schulname <span className="text-red-400">*</span>
              </Label>
              <Input
                id="schulname"
                placeholder="z.B. Gymnasium Musterstadt"
                value={projektDaten.schulname}
                onChange={(e) => handleInputChange("schulname", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projekttitel" className="text-slate-300">
                Projekttitel <span className="text-red-400">*</span>
              </Label>
              <Input
                id="projekttitel"
                placeholder="z.B. Digitalisierung des MINT-Unterrichts"
                value={projektDaten.projekttitel}
                onChange={(e) => handleInputChange("projekttitel", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zeitraum" className="text-slate-300">
                Projektlaufzeit <span className="text-red-400">*</span>
              </Label>
              <Input
                id="zeitraum"
                placeholder="z.B. 01.09.2025 - 31.08.2026"
                value={projektDaten.zeitraum}
                onChange={(e) => handleInputChange("zeitraum", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foerderbetrag" className="text-slate-300">
                Beantragter Betrag (€) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="foerderbetrag"
                type="number"
                min={programm.foerdersummeMin || 0}
                max={programm.foerdersummeMax || 999999}
                value={projektDaten.foerderbetrag}
                onChange={(e) => handleInputChange("foerderbetrag", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-500">
                Förderspanne: {programm.foerdersummeText}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zielgruppe" className="text-slate-300">
              Zielgruppe <span className="text-red-400">*</span>
            </Label>
            <Input
              id="zielgruppe"
              placeholder="z.B. Schüler der Klassen 5-10, ca. 200 Teilnehmende"
              value={projektDaten.zielgruppe}
              onChange={(e) => handleInputChange("zielgruppe", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kurzbeschreibung" className="text-slate-300">
              Kurzbeschreibung des Projekts <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="kurzbeschreibung"
              placeholder="Beschreiben Sie das Projekt in 2-3 Sätzen..."
              value={projektDaten.kurzbeschreibung}
              onChange={(e) => handleInputChange("kurzbeschreibung", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ziele" className="text-slate-300">
              Projektziele <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="ziele"
              placeholder="Welche konkreten Ziele verfolgen Sie mit dem Projekt?"
              value={projektDaten.ziele}
              onChange={(e) => handleInputChange("ziele", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hauptaktivitaeten" className="text-slate-300">
              Hauptaktivitäten <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="hauptaktivitaeten"
              placeholder="Welche Aktivitäten sind geplant? Workshops, Materialien, Veranstaltungen..."
              value={projektDaten.hauptaktivitaeten}
              onChange={(e) => handleInputChange("hauptaktivitaeten", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ergebnisse" className="text-slate-300">
              Erwartete Ergebnisse
            </Label>
            <Textarea
              id="ergebnisse"
              placeholder="Welche konkreten Ergebnisse erwarten Sie? (z.B. Unterrichtsmaterialien, Schulung von Lehrkräften...)"
              value={projektDaten.ergebnisse}
              onChange={(e) => handleInputChange("ergebnisse", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nachhaltigkeit" className="text-slate-300">
              Nachhaltigkeit
            </Label>
            <Textarea
              id="nachhaltigkeit"
              placeholder="Wie wird das Projekt nach Förderende weitergeführt?"
              value={projektDaten.nachhaltigkeit}
              onChange={(e) => handleInputChange("nachhaltigkeit", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
            />
          </div>
        </div>

        {/* Hinweis */}
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-blue-400 mb-1">Wie es funktioniert</p>
              <p>
                Die KI analysiert die Programmdetails von „{programm.name}" und erstellt einen 
                maßgeschneiderten Antragstext. Je detaillierter Ihre Angaben, desto besser der generierte Text.
                Die generierten Texte sind programmspezifisch für {programm.foerdergeberTyp === "bund" ? "Bundesförderungen" : 
                programm.foerdergeberTyp === "land" ? "Landesförderungen" :
                programm.foerdergeberTyp === "stiftung" ? "Stiftungsförderungen" :
                programm.foerdergeberTyp === "eu" ? "EU-Förderungen" : "Förderprogramme"} optimiert.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={!isFormValid()}
            className="gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            KI-Antrag generieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
