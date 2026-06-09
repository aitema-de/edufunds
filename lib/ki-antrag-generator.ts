// KI-Antragsgenerierung - API-Integration
// Diese Datei ruft den Backend-API-Endpoint auf, der Gemini nutzt

import type { Foerderprogramm } from "@/lib/foerderSchema";

export interface ProjektDaten {
  schulname: string;
  projekttitel: string;
  kurzbeschreibung: string;
  ziele: string;
  zielgruppe: string;
  zeitraum: string;
  hauptaktivitaeten: string;
  ergebnisse: string;
  nachhaltigkeit: string;
  foerderbetrag: string;
}

export class KIAntragError extends Error {
  code: string;
  recoverable: boolean;

  constructor(message: string, code: string = "KI_ERROR", recoverable: boolean = false) {
    super(message);
    this.code = code;
    this.recoverable = recoverable;
    this.name = "KIAntragError";
  }
}

// Hauptfunktion: Ruft API-Endpoint auf
export async function generateAntrag(
  programm: Foerderprogramm,
  projektDaten: ProjektDaten
): Promise<string> {
  try {
    // API-Endpoint aufrufen
    const response = await fetch("/api/assistant/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        programm: {
          id: programm.id,
          name: programm.name,
          foerdergeber: programm.foerdergeber,
          foerdergeberTyp: programm.foerdergeberTyp,
          foerdersummeText: programm.foerdersummeText,
          bewerbungsfristText: programm.bewerbungsfristText,
          kategorien: programm.kategorien,
          kurzbeschreibung: programm.kurzbeschreibung,
        },
        projektDaten,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new KIAntragError(
        errorData.error || "Fehler bei der Antragsgenerierung",
        "API_ERROR",
        false
      );
    }

    const data = await response.json();
    
    if (!data.antrag) {
      throw new KIAntragError(
        "Kein Antragstext in der Antwort",
        "INVALID_RESPONSE",
        false
      );
    }

    return data.antrag;

  } catch (error) {
    console.error("KI-Antrag Fehler:", error);
    
    if (error instanceof KIAntragError) {
      throw error;
    }
    
    // Fallback: Generiere lokalen Mock-Antrag
    console.warn("API nicht verfügbar, nutze Fallback");
    return generateFallbackAntrag(programm, projektDaten);
  }
}

// Fallback-Funktion wenn API nicht verfügbar
function generateFallbackAntrag(programm: Foerderprogramm, projektDaten: ProjektDaten): string {
  const kategorienText = programm.kategorien.map(k => 
    k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, " ")
  ).join(", ");

  return `# FÖRDERANTRAG

## ${projektDaten.projekttitel}

---

### 1. EINLEITUNG UND PROJEKTÜBERSICHT

Die ${projektDaten.schulname} beantragt im Rahmen des Programms „${programm.name}" (${programm.foerdergeber}) einen Zuschuss in Höhe von ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} €.

**Projektträger:** ${projektDaten.schulname}  
**Projektlaufzeit:** ${projektDaten.zeitraum}  
**Beantragte Fördersumme:** ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} €

---

### 2. PROJEKTBESCHREIBUNG

**Kurzbeschreibung:**  
${projektDaten.kurzbeschreibung}

**Projektziele:**  
${projektDaten.ziele}

**Zielgruppe:**  
${projektDaten.zielgruppe}

---

### 3. PROJEKTUMSETZUNG

**Geplante Hauptaktivitäten:**  
${projektDaten.hauptaktivitaeten}

Das Projekt gliedert sich in vier aufeinander aufbauende Phasen:

1. **Vorbereitungsphase (Monat 1-2):** Bedarfsanalyse, Feinkonzeption
2. **Implementierungsphase (Monat 3-8):** Umsetzung der geplanten Aktivitäten
3. **Intensivierungsphase (Monat 9-10):** Verstetigung etablierter Strukturen
4. **Abschlussphase (Monat 11-12):** Ergebnissicherung, Nachhaltigkeitsplanung

---

### 4. PASSUNG ZUM FÖRDERPROGRAMM

Das Projekt adressiert die Kategorien: ${kategorienText}

Es entspricht den Förderrichtlinien des Programms und erfüllt alle formellen sowie inhaltlichen Anforderungen.

---

### 5. ERWARTETE ERGEBNISSE UND WIRKUNG

${projektDaten.ergebnisse || "- Konkrete Projektergebnisse und Materialien\n- Qualitative Kompetenzentwicklung\n- Nachhaltige Verankerung im Schulalltag"}

---

### 6. NACHHALTIGKEIT

${projektDaten.nachhaltigkeit || "Das Projekt ist für nachhaltige Wirkung über die Förderphase hinaus konzipiert. Entwickelte Konzepte und Materialien werden in den Regelbetrieb überführt."}

---

### 7. BUDGETÜBERSICHT

| Position | Betrag (€) |
|----------|------------|
| Beantragte Förderung | ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} |
| Programm | ${programm.name} |
| Fördergeber | ${programm.foerdergeber} |

---

### 8. ABSCHLUSS

Die ${projektDaten.schulname} freut sich auf eine positive Prüfung des Antrags und die Möglichkeit, mit dem Projekt „${projektDaten.projekttitel}" einen wertvollen Beitrag zu leisten.

Mit freundlichen Grüßen  
Das Projektteam der ${projektDaten.schulname}

---

*Hinweis: Dieser Antrag wurde im Offline-Modus generiert. Für optimale Ergebnisse stellen Sie sicher, dass die KI-API verfügbar ist.*
`;
}
