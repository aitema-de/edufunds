export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import foerderprogramme from '@/data/foerderprogramme.json';

// Static export - keine Filterung möglich
// Frontend filtert selbst
export async function GET() {
  return new NextResponse(JSON.stringify(foerderprogramme), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
