export const dynamic = 'force-static';

import { MetadataRoute } from 'next';
import foerderprogrammeData from '@/data/foerderprogramme.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://edufunds.org';
  
  // Statische Seiten
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/foerderprogramme', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/preise', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/ueber-uns', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/kontakt', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/agb', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/avv', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/datenschutz', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/impressum', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  // Förderprogramme-Seiten
  const programmPages = foerderprogrammeData.map((programm) => ({
    url: `${baseUrl}/foerderprogramme/${programm.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Alle Seiten kombinieren
  const allPages = [
    ...staticPages.map(page => ({
      url: `${baseUrl}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...programmPages,
  ];

  return allPages;
}
