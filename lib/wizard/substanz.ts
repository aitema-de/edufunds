/**
 * Substanz-Detektor: Traegt ein inhaltlicher Abschnitt eine BEGRUENDUNG —
 * oder beschreibt er nur?
 *
 * Anlass (Kolja, 22.07.2026): "Zu einem guten Antrag gehoert nicht nur die
 * Beschreibung des Vorhabens, sondern besonders auch eine sozialpaedagogische
 * und theoretisch-bildungswissenschaftliche Begruendung. [...] Die Theorie
 * dient als Begruendung fuer die Notwendigkeit, das Anliegen umzusetzen."
 * Die Anweisung stand laengst im Prompt (Fachliche Qualitaet & Theorie),
 * hatte aber keinen Wachhund: In 64 Eval-Laeufen kam die ausdruecklich
 * erlaubte Vorschlags-Formulierung genau 1x vor. Was nicht gemessen wird,
 * faellt weg, sobald der Platz knapp ist.
 *
 * BEWUSST DETERMINISTISCH (Lexikon + Konnektive), kein LLM-Judge: WIZ-03
 * zeigt, was mit LLM-Judges passiert — zu verrauscht fuer ein hartes Gate,
 * seit Monaten warning-only bei 46/100, und alle haben sich daran gewoehnt.
 * Ein Lexikon ist grober, aber transparent, kostenlos, in CI lauffaehig und
 * in beide Richtungen pruefbar. Es misst NICHT "gute Theorie", sondern
 * "Begruendungs-SIGNALE vorhanden" — ein notwendiges, kein hinreichendes
 * Kriterium. Die Qualitaet der Begruendung bleibt Sache von Critique/Mensch.
 */

/** Fachkonzepte, wie sie der SECTION_SYSTEM-Prompt selbst als Beispiele nennt
 *  (Bildungsgerechtigkeit, Selbstwirksamkeit, ...) plus gaengige Nachbarn. */
const THEORIE_MARKER =
  /\b(Selbstwirksamkeit|Bildungsgerechtigkeit|Chancengerechtigkeit|Chancengleichheit|Teilhabe|Partizipation|partizipativ\w*|handlungsorientiert\w*|erfahrungsorientiert\w*|lebensweltorientiert\w*|Lebenswelt\w*|Sozialraum\w*|sozialraumorientiert\w*|Empowerment|Resilienz\w*|Inklusion|inklusiv\w*|Heterogenit\w+|Diversit\w+|BNE|Bildung fuer nachhaltige Entwicklung|Bildung für nachhaltige Entwicklung|demokratiep(ae|ä)dagogi\w*|Demokratiebildung|Medienkompetenz\w*|Medienbildung|Kompetenzorientier\w*|Selbstbestimmung|Selbststaendigkeit|Selbstständigkeit|Peer-?\w*|Ko-?Konstruktion|Scaffolding|Zone der n(ae|ä)chsten Entwicklung|intrinsische\w* Motivation|Motivationsf\w+|Bindungs\w+|Beziehungsarbeit|Sozialkompetenz\w*|Selbstkonzept\w*|Berufsorientierung|Produktionsschul\w*|Praxislernen|Projektlernen|projektbasiert\w*|entdeckende\w* Lernen|forschende\w* Lernen|informelle\w* Lernen|non-?formale\w* Bildung|kulturelle\w* Bildung|(ae|ä)sthetische\w* Bildung|politische\w* Bildung|Wirkungslogik|Wirkungskette|Output|Outcome|Prävention|Praevention|pr(ae|ä)ventiv\w*)\b/gi;

/** Kausale/begruendende Verknuepfungen — das sprachliche Geruest von
 *  "WAS wir tun" nach "WARUM es noetig ist". Bewusst breiter als nur
 *  "weil/daher": Ein hochwertiger Antrag (pv-004, Schulpreis-Register)
 *  begruendet empirisch ("fusst auf", "speist sich aus", "durch externe
 *  Evaluationen belegt") statt ueber benannte Theorie — auch das ist
 *  Begruendung, keine Beschreibung. */
const BEGRUENDUNGS_KONNEKTIVE =
  /\b(weil|denn|deshalb|daher|darum|somit|folglich|dadurch|hierdurch|damit\s+(?:die|der|das|sie|er|es|Kinder|Sch(ue|ü)ler)|vor diesem Hintergrund|auf dieser Grundlage|aus diesem Grund|zugrunde\s?lieg\w*|liegt\s+zugrunde|basiert auf|beruht auf|gest(ue|ü)tzt auf|st(ue|ü)tzt sich auf|fu(ss|ß)t auf|speis\w+ sich aus|resultier\w+ aus|ergibt sich aus|erw(ae|ä)chst aus|f(ue|ü)hrt dazu|tr(ae|ä)gt dazu bei|setzt (?:genau |gezielt )?(?:hier|dort|daran) an|kn(ue|ü)pft an|ankn(ue|ü)pfend|greift .{0,30}auf|orientiert sich an|folgt dem (?:Ansatz|Prinzip|Konzept|Modell)|im Sinne (?:des|der|von)|nach dem (?:Ansatz|Prinzip|Konzept|Modell)|im Einklang mit|Forschung zeigt|Studien (?:zeigen|belegen)|Evaluation\w* (?:zeig|beleg)\w*|durch .{0,40}(?:Evaluation|Erhebung|Befragung)\w* belegt|erwiesen\w*|belegt\w* ist|bew(ae|ä)hrte\w*)\b/gi;

/**
 * Abschnitte, in die KEINE Begruendung gehoert — erkannt am Namen. Alles
 * andere gilt als inhaltlich. Bewusst als Ausschluss- statt Einschlussliste:
 * Die Pipeline erzeugt kreative Ueberschriften ("Unsere Schule: Ein
 * MINT-Leuchtturm in Fellbach"), die keine Schluesselwort-Einschlussliste je
 * traefe — im Kalibrierlauf fielen so 240 von 413 Abschnitten faelschlich
 * aus der Messung. Zuverlaessig am Namen erkennbar ist nur das Formale
 * (Finanzplan, Zeitplan, Kontakt); der Rest ist Inhalt.
 */
const IRRELEVANT_MUSTER =
  /finanz|budget|kosten|zeitplan|arbeitsplan|meilenstein|kontakt|antragsteller|formal|anlagen|unterschrift|bankverbindung|mengenger(ue|ü)st/i;

export interface SubstanzBefund {
  /** Muss dieser Abschnitt ueberhaupt begruenden? */
  relevant: boolean;
  theorieMarker: number;
  konnektive: number;
  /** Begruendungs-Signale vorhanden (notwendige Bedingung, s. Kopfkommentar). */
  hatSubstanz: boolean;
}

/**
 * Schwellen kalibriert am Eval-Korpus 22.07.2026 (64 Laeufe / 413 Abschnitte,
 * s. Kalibrierlauf im PR): Der Ist-Zustand, den Kolja als "zu banal"
 * beurteilt, soll mehrheitlich DURCHFALLEN, ein begruendeter Abschnitt (wie
 * Arm B des A/B-Smokes) sicher bestehen.
 */
export const SUBSTANZ_MIN_THEORIE = 1;
export const SUBSTANZ_MIN_KONNEKTIVE = 2;
/** Weg (b): dichte Kausal-Argumentation ersetzt benannte Theorie. Kalibriert:
 *  Schwelle 3 laesst die Baseline unveraendert (2/363 Abschnitte), wuerdigt
 *  aber das empirische Register (pv-004 "Leistung": K=3, T=0 — argumentiert
 *  ueber Evaluationsbelege statt ueber Konzeptnamen). */
export const SUBSTANZ_STARK_KONNEKTIVE = 3;

export function pruefeSubstanz(abschnittName: string, text: string): SubstanzBefund {
  const relevant = !IRRELEVANT_MUSTER.test(abschnittName);
  const theorieMarker = (text.match(THEORIE_MARKER) || []).length;
  const konnektive = (text.match(BEGRUENDUNGS_KONNEKTIVE) || []).length;
  return {
    relevant,
    theorieMarker,
    konnektive,
    // Zwei Wege zur Substanz:
    //  (a) benannte Theorie + kausale Verknuepfung (der Normalfall), ODER
    //  (b) dichte kausale Argumentation ohne benanntes Konzept (>= 3
    //      Konnektive) — das empirische Register hochwertiger Antraege
    //      ("fusst auf Evaluationsergebnissen"), dem ein erzwungener
    //      Konzeptname nur Etiketten aufklebte.
    hatSubstanz:
      (theorieMarker >= SUBSTANZ_MIN_THEORIE && konnektive >= SUBSTANZ_MIN_KONNEKTIVE) ||
      konnektive >= SUBSTANZ_STARK_KONNEKTIVE,
  };
}

/**
 * Zerlegt den finalen Antragstext (Markdown) in Abschnitte entlang der
 * ##-Ueberschriften. Fuer WIZ-04 zaehlt die FINALE Fassung — das Artefakt,
 * das der Kunde bekommt —, nicht der Entwurf: Die Revision veraendert Texte
 * nach den Substanz-Findings, und genau diese Wirkung muss die Metrik sehen.
 * (Erster Live-Test 22.07. hat den Entwurf gemessen und die Reparatur
 * uebersehen — die Falle aus feedback-eval-muss-user-artefakt-messen.)
 */
export function splitFinalText(finalText: string): Array<{ name: string; text: string }> {
  return finalText
    .split(/^##\s+/m)
    .slice(1) // alles vor der ersten ##-Ueberschrift ist Titel/Praeambel
    .map((teil) => {
      const nl = teil.indexOf("\n");
      if (nl === -1) return { name: teil.trim(), text: "" };
      return { name: teil.slice(0, nl).trim(), text: teil.slice(nl + 1) };
    });
}

/**
 * Quote ueber einen ganzen Antrag: Anteil der relevanten Abschnitte mit
 * Substanz-Signalen. Basis fuer die Eval-Metrik WIZ-04.
 * Kein relevanter Abschnitt -> null (nicht messbar, NICHT als 100 % werten —
 * sonst gewinnt ein Antrag ohne Inhaltsabschnitte).
 */
export function substanzQuote(
  sections: Array<{ name: string; text: string }>
): number | null {
  const relevante = sections
    .map((s) => pruefeSubstanz(s.name, s.text))
    .filter((b) => b.relevant);
  if (relevante.length === 0) return null;
  return relevante.filter((b) => b.hatSubstanz).length / relevante.length;
}

/**
 * Macht aus fehlender Substanz Critique-Findings, damit die BESTEHENDE
 * Revisions-Schleife die Begruendung nachliefert — repariert statt nur
 * bemaengelt. Schwere "mittel": bewusst nicht "hoch", damit ein rein
 * stilistischer Befund nicht dieselbe Eskalation ausloest wie eine
 * Halluzination (hasOpenHighFindings haengt an "hoch").
 */
export function substanzFindings(
  sections: Array<{ name: string; text: string }>
): Array<{
  abschnitt: string;
  zitat: string;
  schwere: "mittel";
  kategorie: "substanz";
  vorschlag: string;
}> {
  const findings = [];
  for (const s of sections) {
    const b = pruefeSubstanz(s.name, s.text);
    if (!b.relevant || b.hatSubstanz) continue;
    const fehlt =
      b.theorieMarker < SUBSTANZ_MIN_THEORIE && b.konnektive < SUBSTANZ_MIN_KONNEKTIVE
        ? "fachliche Einordnung UND Begruendungslogik"
        : b.theorieMarker < SUBSTANZ_MIN_THEORIE
          ? "fachliche Einordnung (paedagogisches Konzept/Modell)"
          : "Begruendungslogik (Kausalverbindungen)";
    findings.push({
      abschnitt: s.name,
      zitat: "FEHLT" as const,
      schwere: "mittel" as const,
      kategorie: "substanz" as const,
      vorschlag:
        `Der Abschnitt beschreibt, aber begruendet nicht — es fehlt: ${fehlt}. ` +
        `ERWEITERE den Abschnitt um 2-4 Saetze Begruendung (NICHT stattdessen anderes kuerzen): ` +
        `Verbinde das beschriebene Vorhaben ueber Kausalsaetze (weil / daher / auf dieser Grundlage) ` +
        `mit dem paedagogischen Konzept, das seine NOTWENDIGKEIT traegt (z. B. Selbstwirksamkeit, ` +
        `Teilhabe, Praxislernen — passend zum Vorhaben gewaehlt und am Vorhaben erklaert, nicht als Etikett). ` +
        `Muster: "Wir tun X, weil <Konzept> zeigt, dass <Wirkmechanismus> — daher <Verbindung zum Ziel>." ` +
        `Der Abschnitt DARF dafuer laenger werden; die Laengenvorgabe ist dieser Ergaenzung nachgeordnet. ` +
        `Diese theoretische Rahmung ist erwuenschte Fachlichkeit, KEINE Halluzination — ` +
        `erfunden waeren nur neue Tatsachen ueber die Schule.`,
    });
  }
  return findings;
}
