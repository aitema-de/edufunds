/**
 * Snapshot/Replay-Determinismus + Schema-Version-Check.
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Snapshot-Schema: { _TODO, korpus_id, meta: { schemaVersion: 1, iso, runIndex } }
 * Snapshots unter data/eval/pipeline-snapshots/<ISO>/<entry-id>-run<N>.json (D-07).
 * Replay-Modus liest Snapshots, kein LLM-Call (--replay default, --live erzwingt LLM).
 */
describe("Snapshot/Replay-Determinismus", () => {
  it.todo("Snapshot-Schema-Version-1-Check: Snapshot ohne meta.schemaVersion → Fehler");
  it.todo("Replay liest Datei aus korrektem Pfad <ISO>/<entry-id>-run<N>.json");
  it.todo("identischer Score bei 5× scoreWiz01-Aufruf auf gleichem Snapshot (kein LLM-Rauschen)");
});
