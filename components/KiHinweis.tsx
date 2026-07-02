import { Bot, Sparkles } from "lucide-react";

/**
 * KI-Transparenz-Hinweis nach EU-AI-Act Art. 50 (gilt ab 02.08.2026).
 *
 *   - "interaktion" → Art. 50(1): offenlegen, dass der Nutzer mit einem
 *     KI-System interagiert (am Wizard-Start, vor der Eingabe).
 *   - "ergebnis"    → Art. 50(2): den KI-generierten Antragstext als
 *     künstlich erzeugt kennzeichnen (am Ergebnis, vor Export/Einreichung).
 *
 * Bewusst getrennt vom DSGVO-Trust-Baustein ([[DsgvoTrust]]) — andere
 * Rechtsgrundlage, andere Aussage.
 */

/**
 * Kennzeichnung, die in den EXPORTIERTEN Antrag (Kopieren/.txt/.doc/PDF)
 * geschrieben wird, damit das Dokument selbst als KI-erzeugt erkennbar ist
 * (Art. 50(2) — Kennzeichnung wandert mit dem Artefakt mit).
 */
export const KI_EXPORT_HINWEIS =
  "Hinweis: Dieser Förderantrag wurde mit KI-Unterstützung erstellt (EduFunds). " +
  "Bitte prüfen Sie den Inhalt vor der Einreichung — KI-generierte Texte können Fehler enthalten.";

export function KiHinweis({
  variant,
  className = "",
}: {
  variant: "interaktion" | "ergebnis";
  className?: string;
}) {
  const Icon = variant === "interaktion" ? Bot : Sparkles;
  const text =
    variant === "interaktion" ? (
      <>
        <strong className="font-semibold text-[#1c1917]">Hinweis:</strong> Hier unterstützt Sie ein
        KI-Assistent. Ihre Angaben werden von einer künstlichen Intelligenz verarbeitet, um
        Förderprogramme zu finden und einen Antragsentwurf zu erstellen.
      </>
    ) : (
      <>
        <strong className="font-semibold text-[#1c1917]">Mit KI erstellt:</strong> Dieser
        Antragsentwurf wurde von einer künstlichen Intelligenz generiert. Bitte prüfen Sie ihn vor
        der Einreichung — die KI kann Fehler machen.
      </>
    );

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-[#1e3d32]/30 bg-[#1e3d32]/[0.06] px-4 py-3 ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1e3d32]" />
      <p className="text-xs leading-relaxed text-[#57534e]">{text}</p>
    </div>
  );
}
