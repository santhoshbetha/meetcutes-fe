import { api } from "@/lib/api";

/**
 * Creates a Stripe Checkout session for the signed-in user.
 */
export async function createCheckoutSession() {
  const payload = await api.post("/api/v1/payments/create-checkout-session");
  const data = payload?.data ?? payload ?? {};
  const url = data.checkout_url ?? data.url ?? data.checkoutUrl ?? null;

  console.log("createCheckoutSession payload:", payload);
  console.log("createCheckoutSession data:", data);
  console.log("createCheckoutSession url:", url);

  if (!url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return {
    sessionId: data.session_id ?? data.id ?? null,
    url,
  };
}

/**
 * Creates a Stripe Billing Portal session for an existing customer.
 */
export async function createPortalSession() {
  const payload = await api.post("/api/v1/payments/create-portal-session");
  const data = payload?.data ?? payload ?? {};
  const url = data.url ?? data.portal_url ?? data.portalUrl ?? null;

  if (!url) {
    throw new Error("Stripe did not return a billing portal URL.");
  }

  return {
    sessionId: data.session_id ?? data.id ?? null,
    url,
  };
}
