"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

interface Props {
  /** Ref auf den article-Container, in dem die h2-Headings stehen. */
  articleRef: React.RefObject<HTMLElement | null>;
}

/**
 * Slug-Generator fuer h2-Heading-Anker-IDs.
 * - Umlaut-Mapping (ae/oe/ue/ss)
 * - lowercase + non-alphanum durch '-'
 * - max 60 Zeichen
 * Exportiert fuer Unit-Tests.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c]!))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Sticky Sidebar mit Liste der h2-Headings im Antrag-Article.
 * - hidden md:block — auf Mobile keine Sidebar (UI-SPEC D-03)
 * - IntersectionObserver markiert das aktuell sichtbare Heading
 * - returns null wenn keine h2 vorhanden
 */
export function AntragSectionNav({ articleRef }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const h2s = Array.from(article.querySelectorAll("h2[id]")) as HTMLElement[];
    setSections(
      h2s.map((h) => ({
        id: h.id,
        label: (h.textContent ?? "").trim(),
      }))
    );

    if (h2s.length === 0) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -50% 0px" }
    );
    h2s.forEach((h) => observer.observe(h));
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [articleRef]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Antrag-Sektionen"
      className="hidden md:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-1 text-xs"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={
            s.id === activeId
              ? "block border-l-2 border-[#78350f] pl-2 text-[#78350f]"
              : "block pl-2 text-slate-600 hover:text-[#57534e]"
          }
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
