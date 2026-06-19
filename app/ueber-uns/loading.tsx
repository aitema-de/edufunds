import { Header } from "@/components/Header";

// Sofort sichtbarer Ladezustand (statt leerer Seite) waehrend die Ueber-uns-Seite
// laedt — behebt das wahrgenommene "langsame, leere Rendering" (FP-11).
export default function Loading() {
  return (
    <>
      <Header />
      <main
        className="min-h-screen bg-[#fdfdfc] pt-32 pb-20"
        aria-busy="true"
        aria-label="Seite wird geladen"
      >
        <div className="container mx-auto max-w-4xl px-6 animate-pulse">
          <div className="mx-auto h-10 w-1/2 rounded-lg bg-[#ebe5dc] mb-4" />
          <div className="mx-auto h-5 w-3/4 rounded bg-[#ebe5dc] mb-12" />
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-[#ebe5dc]" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
