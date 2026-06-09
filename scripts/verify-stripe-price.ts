import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_EINZELANTRAG;
  if (!key || !priceId) {
    console.error("STRIPE_SECRET_KEY oder STRIPE_PRICE_EINZELANTRAG fehlt");
    process.exit(1);
  }
  const stripe = new Stripe(key);
  const p = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const product = p.product as Stripe.Product;
  console.log(
    JSON.stringify(
      {
        key_mode: key.startsWith("sk_live") ? "LIVE" : key.startsWith("sk_test") ? "TEST" : "?",
        price_livemode: p.livemode,
        unit_amount: p.unit_amount,
        currency: p.currency,
        type: p.type,
        recurring: p.recurring,
        price_active: p.active,
        product_name: product?.name,
        product_active: product?.active,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("FEHLER:", e instanceof Error ? e.message : e);
  process.exit(1);
});
