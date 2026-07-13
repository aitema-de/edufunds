# Mistral — Nachweisakte (Art. 28 DSGVO)

Archivkopien der Vertrags- und Transparenzdokumente unseres KI-Auftragsverarbeiters,
**abgerufen am 13.07.2026**. Jedes PDF trägt oben einen Abrufvermerk (URL + Datum).

| Datei | Inhalt | Stand laut Dokument |
|---|---|---|
| `Mistral-DPA_2026-07-13.pdf` | Data Processing Addendum (der AVV) | **Effective: March 12, 2026** |
| `Mistral-Subprozessoren_2026-07-13.pdf` | Subprozessorliste aus dem Trust Center | Abruf 13.07.2026 |
| `Mistral-Terms_2026-07-13.pdf` | Nutzungsbedingungen (der DPA hängt daran) | Abruf 13.07.2026 |

## Warum archivieren, obwohl nichts zu unterschreiben ist

Der DPA wird **automatisch Vertragsbestandteil** — § 11.2: *„The Data Processing Addendum is
incorporated in the Agreement by reference and forms an integral part of the Agreement."* Es
gibt keinen Button, keine Unterschrift, kein Gegenzeichnen.

Genau deshalb muss er archiviert werden: Ein Verweis auf eine Webseite ist kein Nachweis, denn
die Seite kann sich jederzeit ändern. Für die Rechenschaftspflicht (Art. 5 Abs. 2, Art. 28
DSGVO) brauchen wir die **Fassung, die zum Zeitpunkt unserer Verarbeitung galt** — mit
nachvollziehbarem Abrufdatum. Kommt eine Anfrage von einer Aufsichtsbehörde oder einem
Schulträger, ist dieser Ordner die Antwort.

## Inhaltlich Festgehaltenes (Stand 13.07.2026)

- **Retention:** Ein- und Ausgaben sind 30 Tage zugänglich (§ 10.1). → Deshalb der
  ZDR-Antrag, siehe `../MISTRAL-ZDR-ANTRAG.md`.
- **Kein Training** auf Kundendaten (gilt auf bezahlten Plänen; der Free-Tier ist der
  „Daten-Teilen"-Tarif und für uns ungeeignet).
- **Subprozessoren für La Plateforme** (= die API, die EduFunds nutzt):
  Microsoft Azure (**Schweden, Norwegen**), CoreWeave (EEA), Kong (EEA), Ory (Belgien,
  Deutschland). → Verarbeitung im **EU/EWR**-Raum.
- ⚠️ **Google LLC** ist gelistet mit „Netherlands, United States" — jedoch ausdrücklich für
  *„Le Chat, La Plateforme (**US API**)"*. Wir rufen den Standard-Endpunkt
  `https://api.mistral.ai/v1` auf, **nicht** die US-API. Bei einem künftigen Wechsel des
  Endpunkts wäre das neu zu bewerten.
- ⚠️ **Norwegen ist EWR, nicht EU.** Unsere Formulierung lautet daher „EU/EWR" und nicht
  „ausschließlich EU". Rechtlich gleichwertig (DSGVO gilt im gesamten EWR), aber präzise.
- US-Subprozessoren (Stripe, Twilio, Brave, Intercom, Merge, Blackforest) betreffen
  **Billing bzw. Le Chat/Agents** — nicht die stateless Inferenz, die wir nutzen.

## Pflege

Bei jeder Änderung der Mistral-Bedingungen (oder mindestens jährlich) neu abrufen, mit neuem
Datum ablegen, alte Fassung **behalten** — die Historie ist Teil des Nachweises.
