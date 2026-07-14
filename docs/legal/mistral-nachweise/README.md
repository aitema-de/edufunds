# Mistral — Nachweisakte (Art. 28 DSGVO)

Archivkopien der Vertrags- und Transparenzdokumente unseres KI-Auftragsverarbeiters,
**abgerufen am 13.07.2026**. Jedes PDF trägt oben einen Abrufvermerk (URL + Datum).

| Datei | Inhalt | Stand laut Dokument |
|---|---|---|
| `Mistral-Commercial-ToS_2026-07-13.pdf` | **Commercial Terms of Service** — unser Vertrag | Abruf 13.07.2026 |
| `Mistral-DPA_2026-07-13.pdf` | Data Processing Addendum (der AVV) | **Effective: March 12, 2026** |
| `Mistral-Privacy-Policy_2026-07-13.pdf` | Privacy Policy (der DPA verweist für das Training darauf) | Abruf 13.07.2026 |
| `Mistral-Subprozessoren_2026-07-13.pdf` | Subprozessorliste aus dem Trust Center | Abruf 13.07.2026 |

> ⚠️ **Korrektur 13.07.2026:** Die frühere Datei `Mistral-Terms_2026-07-13.pdf` war **kein
> Vertragstext**, sondern nur die **Linkliste** des Legal Centers (3 Seiten, ~2.200 Zeichen) —
> als Nachweis wertlos. Ursache: Die Verträge liegen auf **`legal.mistral.ai`**;
> `mistral.ai/terms/...` liefert nur eine client-seitig gerenderte Hülle, die beim Drucken leer
> bleibt. **Wer diese Akte aktualisiert, zieht von `legal.mistral.ai` und prüft danach die
> Zeichenzahl** — ein PDF mit ein paar hundert Zeichen ist ein leeres PDF.

## Warum archivieren, obwohl nichts zu unterschreiben ist

Der DPA wird **automatisch Vertragsbestandteil** — § 11.2: *„The Data Processing Addendum is
incorporated in the Agreement by reference and forms an integral part of the Agreement."* Es
gibt keinen Button, keine Unterschrift, kein Gegenzeichnen.

Genau deshalb muss er archiviert werden: Ein Verweis auf eine Webseite ist kein Nachweis, denn
die Seite kann sich jederzeit ändern. Für die Rechenschaftspflicht (Art. 5 Abs. 2, Art. 28
DSGVO) brauchen wir die **Fassung, die zum Zeitpunkt unserer Verarbeitung galt** — mit
nachvollziehbarem Abrufdatum. Kommt eine Anfrage von einer Aufsichtsbehörde oder einem
Schulträger, ist dieser Ordner die Antwort.

## 🔴 Die Trainingsfrage — der Beleg im Wortlaut

Unsere Zusage „**kein Training mit Kundendaten**" (Datenschutzerklärung, AGB § 7 Abs. 2) ruht
auf **zwei** Dokumenten. Der DPA allein trägt sie **nicht** — er klingt sogar gegenteilig:

> **DPA § 2.3 (Mistral AI as Controller):** *„Mistral AI is authorized to process the Personal
> Data as Controller for the purposes of: Training its artificial intelligence models …,
> **unless** (a) Customer opted-out of training or (b) uses a Mistral AI Product that is
> opted-out by default and has not opted-in."*

Die **speziellere** Regel steht in den Commercial ToS und dreht den Grundsatz um:

> **Commercial ToS § 4.2 (Training):** *„Mistral AI **will not use** Customer Data or Outputs to
> train its artificial intelligence models **except** (a) … under a **free subscription**, Vibe
> Pro or Vibe Teams, where Customer has not opted-out …, (b) when Customer or an End User
> provides **Feedback** …, (c) when Customer Data or Outputs are **flagged as part of … automated
> moderation** …, (d) as otherwise may be provided in an **Order Form** or (e) when Customer uses
> **Labs Models**."*

> **Privacy Policy:** *„we **do not** use your Input and Output to train our artificial
> intelligence models when you use Le Chat Enterprise or **the paid version of our APIs**."*

**Keine der fünf Ausnahmen trifft auf EduFunds zu:**

| Ausnahme | Trifft zu? | Beleg |
|---|---|---|
| (a) kostenloses Abo | **nein** | Bezahlte API — Rechnungen `MSTRL-API-850529-001` (12.06.) und `-002` (13.07.), Postfach `office@aitema.de` |
| (b) Feedback („thumbs up/down") | **nein** | Einzige Mistral-Aufrufe im Code: `chat.completions.create` (`lib/wizard/llm.ts`). Der `/api/feedback`-Endpunkt der Plattform geht an ClickUp + E-Mail, **nie an Mistral** |
| (c) Moderations-Flagging | ⚠️ **theoretisch ja** | siehe unten |
| (d) Order Form | **nein** | keines geschlossen |
| (e) Labs Models | **nein** | wir nutzen `mistral-small-latest` — Labs Models tragen laut ToS § 4.3 das Präfix `labs` |

⚠️ **Der Rest, den es zu schließen gilt:** Ausnahme **(c)**. Inhalte, die Mistrals automatische
Missbrauchserkennung flaggt, dürfen zum Training verwendet werden. Genau das beseitigt **Zero
Data Retention** — der DPA nimmt das Abuse-Monitoring dann ausdrücklich zurück (*„except … when
zero data retention has been activated"*). **ZDR ist am 13.07.2026 beantragt**
(`trust@mistral.ai`, Org-ID `582555df-a675-4dd1-812f-597e521eb9ee`); die Antwort steht aus. ZDR
setzt nach Auskunft von Mistral den **Scale-Plan** voraus — wir sind derzeit auf Pay-as-you-go.

**Solange ZDR nicht bestätigt ist, gilt:** Die Aussage „kein Training" ist für den regulären
Verarbeitungsweg **belegt und tragfähig**; für geflaggte Inhalte besteht ein Restrisiko, das wir
nicht verschweigen, sondern durch ZDR beseitigen wollen.

## Weiteres inhaltlich Festgehaltenes (Stand 13.07.2026)

- **Retention:** Ein- und Ausgaben sind 30 Tage zugänglich (DPA § 10.1, Missbrauchserkennung).
  → Entfällt ebenfalls mit ZDR. Antrag: `../MISTRAL-ZDR-ANTRAG.md`.
- **Subprozessoren für La Plateforme** (= die API, die EduFunds nutzt):
  Microsoft Azure (**Schweden, Norwegen**), CoreWeave (EEA), Kong (EEA), Ory (Belgien,
  Deutschland). → Verarbeitung im **EU/EWR**-Raum.
- ⚠️ **Google LLC** ist gelistet mit „Netherlands, United States" — jedoch ausdrücklich für
  *„Le Chat, La Plateforme (**US API**)"*. Wir rufen den Standard-Endpunkt
  `https://api.mistral.ai/v1` auf, **nicht** die US-API. Die `baseURL` ist in
  `lib/wizard/llm.ts` **hartkodiert** und nicht über eine Env-Variable umstellbar — ein
  versehentlicher Wechsel auf die US-Instanz ist damit ausgeschlossen. Bei einer künftigen
  Änderung des Endpunkts wäre das neu zu bewerten.
- ⚠️ **Norwegen ist EWR, nicht EU.** Unsere Formulierung lautet daher „EU/EWR" und nicht
  „ausschließlich EU". Rechtlich gleichwertig (DSGVO gilt im gesamten EWR), aber präzise.
- US-Subprozessoren (Stripe, Twilio, Brave, Intercom, Merge, Blackforest) betreffen
  **Billing bzw. Le Chat/Agents** — nicht die stateless Inferenz, die wir nutzen.

## Pflege

Bei jeder Änderung der Mistral-Bedingungen (oder mindestens jährlich) neu abrufen, mit neuem
Datum ablegen, alte Fassung **behalten** — die Historie ist Teil des Nachweises.

**Ziehen von:** `https://legal.mistral.ai/terms/{commercial-terms-of-service, privacy-policy,
data-processing-addendum}` — **nicht** von `mistral.ai/terms/...` (rendert client-seitig und
druckt leer). Nach dem Abruf die Zeichenzahl prüfen: Die ToS haben rund 43.000, die Privacy
Policy rund 23.000, der DPA rund 22.000 Zeichen. Alles darunter ist ein leeres PDF.

**Noch abzulegen (offen):** Screenshot des Tarif-/Planstatus aus `admin.mistral.ai` als Beleg für
Ausnahme (a) — die Rechnungen belegen die bezahlte Nutzung bereits, der Screenshot macht es
lückenlos. Nach ZDR-Freigabe: Screenshot der aktivierten ZDR unter „Privacy".
