# Mistral — Zero Data Retention (ZDR): Antrag & Kontext

> **Für Kolja.** Unten steht ein fertiger englischer Text zum Absenden. Davor der
> Kontext, damit du bei Rückfragen von Mistral sofort antworten kannst.
> Stand der Recherche: 13.07.2026.

## Worum es geht

Mistral speichert API-Ein- und -Ausgaben standardmäßig **30 Tage** (Missbrauchs-Monitoring,
DPA § 10.1). Mit **Zero Data Retention (ZDR)** entfällt diese Speicherung: Inhalte werden nur
noch so lange verarbeitet, wie es zur Beantwortung der Anfrage nötig ist.

Das ist für EduFunds relevant, weil Schulen und Fördervereine (teils öffentliche Stellen unter
Landes-/Schuldatenschutzrecht) fragen werden, ob Eingaben bei einem KI-Anbieter zwischengelagert
werden. Mit ZDR lautet die Antwort: nein.

## Die drei Hürden — und wie wir sie nehmen

| Mistral verlangt | Unsere Lage |
|---|---|
| **Scale-Plan** — ZDR gibt es nicht auf niedrigeren Tarifen | 🔴 **Offen: unser Tarif ist zu prüfen.** Falls wir noch nicht auf Scale sind, muss der Antrag die Upgrade-Frage mitstellen (im Text unten enthalten). |
| **Nur stateless API-Calls** — ausgeschlossen sind Agents, Batch, Files, Conversations, Libraries, Le Chat | ✅ **Passt exakt.** EduFunds ruft ausschließlich `POST /v1/chat/completions` auf (`lib/wizard/llm.ts`, OpenAI-kompatibles SDK gegen `https://api.mistral.ai/v1`). Keine Files, keine Agents, keine Batches, kein Le Chat. |
| **„Legitimate reasons"** — begründeter Antrag | ✅ Bildungssektor, öffentliche Stellen, Art. 28 DSGVO, dokumentierte DSFA, bereits umgesetzte Datenminimierung. |

## Was nach der Freigabe passiert

ZDR erscheint dann unter **Privacy** in der Admin-Konsole (`admin.mistral.ai`). Erscheint es
dort nicht, ist der Antrag noch nicht bearbeitet. Bei Ablehnung kommt eine E-Mail.
**Wichtig: Nach Freigabe im Admin-Konsolen-Screenshot festhalten** — das ist der Nachweis
gegenüber Schulträgern, und es gehört zu `docs/legal/mistral-nachweise/`.

## Wo einreichen

Über das **Mistral Help Center** (angemeldet, Ticket/„Contact support") oder per E-Mail an den
Support. Die Hilfeseite dazu: `help.mistral.ai` → „Can I activate Zero Data Retention (ZDR)?"

---

## Antragstext (Englisch — zum Kopieren)

**Subject:** Zero Data Retention request — aitema GmbH (EduFunds), education sector

---

Dear Mistral team,

we would like to request **Zero Data Retention (ZDR)** for our organisation's API usage.

**Organisation**
aitema GmbH, Prenzlauer Allee 229, 10405 Berlin, Germany
Commercial register: Amtsgericht Charlottenburg, HRB 283978 B · VAT ID: DE461054353
Mistral organisation: *[Org-Name/ID aus admin.mistral.ai eintragen]*
Contact: Kolja Schumann (Managing Director), office@aitema.de

**Our product**
We operate *EduFunds* (edufunds.org), a platform that helps German schools, school support
associations (*Fördervereine*) and school authorities find public funding programmes and draft
funding applications with AI assistance. Mistral is our sole LLM provider; the AI processing is
a core part of the product.

**Our API usage — fully within ZDR scope**
We use **stateless API calls only**: `POST /v1/chat/completions` against
`https://api.mistral.ai/v1` (via the OpenAI-compatible SDK), model `mistral-small-latest`.

We do **not** use any of the stateful products excluded from ZDR: no Agents API, no batch
processing, no `/v1/files`, no conversations, no libraries, no Le Chat. Our entire usage
therefore falls within the scope for which ZDR is available.

**Legitimate reasons for the request**

1. **Public-sector customers under German state education data protection law.**
   Our users are schools and school authorities. In Germany, public schools are subject to
   state-level school data protection rules in addition to the GDPR. These bodies routinely
   require assurance that submitted content is **not retained** by any AI provider before they
   are allowed to use a tool at all. The 30-day abuse-monitoring retention (DPA § 10.1) is a
   concrete obstacle to their approval processes.

2. **We act as a processor under Art. 28 GDPR and Mistral as our sub-processor.**
   We provide our customers with a data processing agreement and a public sub-processor list
   (edufunds.org/avv) that names Mistral. Minimising retention at the sub-processor level
   directly reduces the risk we have to disclose and justify to every customer.

3. **Data minimisation is already implemented on our side — ZDR completes it.**
   Before any content is sent to your API, we automatically strip identifiers (e-mail
   addresses, phone numbers, IBANs) from free-text fields, and we explicitly instruct users not
   to enter personal data. Our prompts are designed around institutional data (school type,
   federal state, project budget), not personal data. We have documented this in a data
   protection impact assessment. Eliminating retention at your end is the remaining piece to
   make "no personal data is stored anywhere in the AI pipeline" a statement we can make
   without qualification.

4. **Storage limitation (Art. 5(1)(e) GDPR).**
   Retaining inputs for 30 days is not necessary for the purpose we pursue — generating a
   single application draft in one stateless request. ZDR aligns the processing with the
   principle of storage limitation.

**Plan / commercial**
Please confirm whether our current subscription already qualifies for ZDR. If ZDR requires the
Scale plan, we would appreciate details on the conditions and on how to upgrade, so we can
proceed without delay.

Thank you very much — we are happy to provide any further detail you need (technical
integration, DPIA, or our processing documentation).

Kind regards,
Kolja Schumann
Managing Director, aitema GmbH
office@aitema.de

---

## Nach dem Absenden

- [ ] Antrag abgeschickt am: ______
- [ ] Rückfrage/Antwort von Mistral am: ______
- [ ] ZDR sichtbar unter `admin.mistral.ai` → Privacy: ☐ ja ☐ nein
- [ ] Screenshot als Nachweis in `docs/legal/mistral-nachweise/` abgelegt
- [ ] Falls Scale-Upgrade nötig: Kosten geprüft (bei unserem Volumen sind die reinen
      Inferenzkosten Cent-Beträge pro Antrag — ein Plan-Aufpreis ist die relevante Größe)
- [ ] Danach: Datenschutzerklärung + `/avv` um den Satz „keine Speicherung beim KI-Anbieter
      (Zero Data Retention)" ergänzen
