import type { Foerderprogramm } from "@/lib/foerderSchema";

// SWR Fetcher für Förderprogramme
export const foerderprogrammeFetcher = async (url: string): Promise<Foerderprogramm[]> => {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

// Cache-Key für SWR
export const FOERDERPROGRAMME_CACHE_KEY = '/api/foerderprogramme';

// SWR Konfiguration
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 Minute
  keepPreviousData: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

export default foerderprogrammeFetcher;
