/**
 * Live-Smoke: erzeugt einen echten Newsletter-Entwurf über das LLM
 * (Programme deterministisch aus dem Katalog) und rendert ihn als HTML.
 *
 * Kein DB-Zugriff nötig. Nutzung:
 *   npx tsx --env-file=.env.local scripts/smoke-newsletter-generate.ts
 *
 * Ergebnis: tmp/newsletter-preview.html (im Browser/Playwright prüfbar)
 *           + Konsolen-Zusammenfassung.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateNewsletterDraft } from '../lib/newsletter/generate-draft';
import { generateNewsletter } from '../lib/newsletter';

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edufunds.org';
  console.log(`[smoke] Provider=${process.env.LLM_PROVIDER || 'mistral'} — generiere Entwurf …`);

  const t0 = Date.now();
  const draft = await generateNewsletterDraft({ issueNumber: 1, baseUrl });
  const ms = Date.now() - t0;

  const d = draft.data;
  console.log(`\n[smoke] OK in ${(ms / 1000).toFixed(1)}s (Provider ${draft.provider})`);
  console.log('─'.repeat(60));
  console.log(`Lead:    ${d.leadTitle}`);
  console.log(`         ${d.leadContent.slice(0, 120)}…`);
  console.log(`Tipp:    ${d.tipTitle}`);
  console.log(`Insight: [${d.insightCategory}, ${d.insightReadTime} Min.] ${d.insightTitle}`);
  console.log(`Programme (${d.programs.length}, deterministisch aus Katalog):`);
  for (const p of d.programs) console.log(`  • ${p.name} — ${p.funder} (${p.deadline})`);
  console.log(`News (${d.newsItems.length}):`);
  for (const n of d.newsItems) console.log(`  • ${n.text}${n.url ? ` [${n.url}]` : ''}`);
  console.log('─'.repeat(60));

  // Halluzinations-Wächter: News-URLs dürfen nur edufunds-intern sein.
  const badUrls = d.newsItems
    .map((n) => n.url)
    .filter((u): u is string => !!u && !/edufunds\.org/i.test(u));
  if (badUrls.length) {
    console.warn(`[smoke] ⚠️  Externe News-URLs entdeckt (Prompt verlangt edufunds.org):`, badUrls);
  } else {
    console.log('[smoke] ✓ Keine externen News-URLs (Halluzinations-Wächter ok)');
  }

  const { html, subject } = generateNewsletter(d, baseUrl, 'preview-token');
  const outDir = join(process.cwd(), 'tmp');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'newsletter-preview.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log(`[smoke] Betreff: ${subject}`);
  console.log(`[smoke] HTML gerendert → ${outPath}`);
}

main().catch((err) => {
  console.error('[smoke] FEHLER:', err);
  process.exit(1);
});
