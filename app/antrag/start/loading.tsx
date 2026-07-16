import { Header } from "@/components/Header";

// Sofort sichtbarer Ladezustand (statt leerer Seite) waehrend der KI-Foerderfinder
// laedt — behebt den Eindruck "Klick wirkungslos" beim Wechsel auf diese Seite.
export default function Loading() {
  return (
    <>
      <Header />
      <main
        className="min-h-screen bg-[#fdfdfc] pt-24 pb-20"
        aria-busy="true"
        aria-label="Seite wird geladen"
      >
        <div className="container mx-auto max-w-3xl px-4 animate-pulse">
          <div className="h-9 w-2/3 rounded-lg bg-[#ebe5dc] mb-4" />
          <div className="h-5 w-full rounded bg-[#ebe5dc] mb-2" />
          <div className="h-5 w-5/6 rounded bg-[#ebe5dc] mb-10" />
          <div className="h-44 w-full rounded-2xl bg-[#ebe5dc] mb-4" />
          <div className="h-12 w-48 rounded-xl bg-[#ebe5dc]" />
        </div>
      </main>
    </>
  );
}
