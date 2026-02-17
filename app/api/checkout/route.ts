export const dynamic = 'force-static';

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Bestellungen speichern (in Produktion: Datenbank)
const orders = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      productType, // 'einzel' | 'jahresabo'
      paymentMethod, // 'rechnung' | 'lastschrift' | 'kreditkarte'
      customerData,
      amount
    } = body;

    // Validierung
    if (!productType || !paymentMethod || !customerData || !amount) {
      return NextResponse.json(
        { error: "Fehlende Pflichtfelder" },
        { status: 400 }
      );
    }

    // Bestell-ID generieren
    const orderId = randomUUID();
    const orderNumber = `EDU-${Date.now().toString(36).toUpperCase()}`;

    // Bestellung erstellen
    const order: any = {
      id: orderId,
      orderNumber,
      productType,
      paymentMethod,
      amount,
      customerData,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Zahlungsmethode-spezifische Verarbeitung
    if (paymentMethod === "rechnung") {
      // Rechnungskauf: Rechnung erstellen
      order.invoiceNumber = `RE-${Date.now()}`;
      order.paymentInstructions = {
        type: "rechnung",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 Tage
        bankDetails: {
          recipient: "Aitema GmbH",
          iban: "DE91 4306 0967 1250 4734 00",
          bic: "GENODEM1GLS",
          bank: "GLS Bank",
          reference: orderNumber,
        },
      };
      order.status = "invoice_sent";
      
      // TODO: E-Mail mit Rechnung senden
      
    } else if (paymentMethod === "lastschrift") {
      // SEPA-Lastschrift
      if (!customerData.iban) {
        return NextResponse.json(
          { error: "IBAN erforderlich für Lastschrift" },
          { status: 400 }
        );
      }

      // Mandat erstellen
      order.mandate = {
        mandateReference: `MAND-${Date.now()}`,
        mandateDate: new Date().toISOString(),
        iban: customerData.iban,
        bic: customerData.bic || null,
        accountHolder: customerData.accountHolder || customerData.name,
      };
      
      order.paymentInstructions = {
        type: "lastschrift",
        collectionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 Tage
        amount: amount,
      };
      order.status = "mandate_created";
      
      // TODO: Lastschrift bei Bank einreichen
      
    } else if (paymentMethod === "kreditkarte") {
      // Kreditkarte (Stripe-Integration vorbereitet)
      order.status = "payment_required";
      order.paymentInstructions = {
        type: "kreditkarte",
        stripeSessionUrl: null, // Wird später gesetzt
      };
    }

    // Bestellung speichern
    orders.set(orderId, order);

    // Erfolgsantwort
    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      status: order.status,
      paymentInstructions: order.paymentInstructions,
      message: getSuccessMessage(paymentMethod),
    });

  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler", details: String(error) },
      { status: 500 }
    );
  }
}

// Bestellung abrufen
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  
  if (!orderId) {
    return NextResponse.json(
      { error: "OrderId erforderlich" },
      { status: 400 }
    );
  }

  const order = orders.get(orderId);
  
  if (!order) {
    return NextResponse.json(
      { error: "Bestellung nicht gefunden" },
      { status: 404 }
    );
  }

  return NextResponse.json({ order });
}

function getSuccessMessage(paymentMethod: string): string {
  switch (paymentMethod) {
    case "rechnung":
      return "Bestellung erfolgreich! Die Rechnung wurde per E-Mail versendet.";
    case "lastschrift":
      return "Bestellung erfolgreich! Die Lastschrift wird in 3 Tagen eingezogen.";
    case "kreditkarte":
      return "Bitte schließen Sie die Zahlung ab.";
    default:
      return "Bestellung erfolgreich!";
  }
}
