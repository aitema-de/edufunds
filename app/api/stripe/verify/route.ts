export const dynamic = 'force-static';

import { NextResponse } from "next/server";

/**
 * GET /api/stripe/verify
 * 
 * NOTE: Static export - Stripe verification requires server-side processing.
 * This endpoint returns an error message instructing users to contact support.
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: "Zahlungsverifizierung ist im Moment nicht verfügbar. Bitte kontaktieren Sie uns unter kontakt@edufunds.org." 
    },
    { status: 503 }
  );
}
