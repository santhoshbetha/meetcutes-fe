import crypto from "node:crypto";
import { test, expect } from "@playwright/test";
import {
  API_URL,
  USERS,
  apiLogin,
  getProfile,
  login,
} from "./helpers.js";

const WEBHOOK_SECRET = "whsec_e2e_paywall_test";

function signStripePayload(payload, secret = WEBHOOK_SECRET) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return `t=${timestamp},v1=${digest}`;
}

function checkoutPayload(userId, chargeId) {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${chargeId}`,
        payment_intent: chargeId,
        amount_total: 5_000,
        customer: "cus_e2e_paywall",
        client_reference_id: userId,
        metadata: { user_id: userId },
      },
    },
  });
}

const PAYWALL_BANNER = /Premium Threshold Reached!/;

async function expectPaywallActive(page) {
  await expect(page.getByText(PAYWALL_BANNER).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: "UNLOCK MY MATCHES" }),
  ).toBeVisible();
}

test.describe("Stripe paywall", () => {
  test("Scenario A: 205-match account sees disabled search on both surfaces", async ({
    page,
  }) => {
    await login(page, USERS.paywall.email);

    await page.goto("/dashboard/users");
    await expectPaywallActive(page);
    await expect(
      page.getByRole("button", { name: /Find Matches/i }),
    ).toBeDisabled();

    await page.goto("/dashboard/events");
    await expectPaywallActive(page);
    await expect(
      page.getByRole("button", { name: /Find Events/i }).first(),
    ).toBeDisabled();
  });

  test("Scenario B: unlock button sends an authenticated checkout request", async ({
    page,
  }) => {
    await login(page, USERS.paywall.email);
    await page.goto("/dashboard/users");
    await expectPaywallActive(page);

    let checkoutRequest = null;

    await page.route(
      "**/api/v1/payments/create-checkout-session",
      async (route) => {
        checkoutRequest = {
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postData(),
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            data: {
              session_id: "cs_test_e2e_paywall",
              checkout_url: "https://stripe.com/checkout/e2e-paywall",
            },
          }),
        });
      },
    );

    await page.route("https://stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Stripe Checkout</h1></body></html>",
      }),
    );

    const requestPromise = page.waitForRequest(
      "**/api/v1/payments/create-checkout-session",
    );

    await page.getByRole("button", { name: "UNLOCK MY MATCHES" }).click();
    await requestPromise;

    expect(checkoutRequest).not.toBeNull();
    expect(checkoutRequest.method).toBe("POST");
    expect(checkoutRequest.headers.authorization).toMatch(/^Bearer .+/);
    expect(checkoutRequest.body ?? "").not.toContain("undefined");
    await expect(page).toHaveURL(/stripe\.com/);
  });

  test("Scenario D: billing portal handshake redirects to Stripe", async ({
    page,
  }) => {
    await login(page, USERS.paywall.email);
    await page.goto("/dashboard?tab=settings");

    await expect(
      page.getByRole("heading", { name: "Billing & Invoices" }),
    ).toBeVisible({ timeout: 30_000 });

    let portalRequest = null;

    await page.route(
      "**/api/v1/payments/create-portal-session",
      async (route) => {
        portalRequest = {
          method: route.request().method(),
          headers: route.request().headers(),
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            data: {
              session_id: "bps_test_e2e",
              url: "https://stripe.com/billing/portal/e2e",
            },
          }),
        });
      },
    );

    await page.route("https://stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Stripe Billing Portal</h1></body></html>",
      }),
    );

    const requestPromise = page.waitForRequest(
      "**/api/v1/payments/create-portal-session",
    );

    await page
      .getByRole("button", { name: "Manage Subscription & Invoices" })
      .click();
    await requestPromise;

    expect(portalRequest).not.toBeNull();
    expect(portalRequest.method).toBe("POST");
    expect(portalRequest.headers.authorization).toMatch(/^Bearer .+/);
    await expect(page).toHaveURL(/stripe\.com\/billing\/portal/);
  });

  test("Scenario C: signed webhook activates membership and unlocks search", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.paywall.email);
    const profile = await getProfile(request, token);

    await login(page, USERS.paywall.email);
    await page.goto("/dashboard/users");
    await expectPaywallActive(page);
    await expect(
      page.getByRole("button", { name: /Find Matches/i }),
    ).toBeDisabled();

    const chargeId = `pi_e2e_${Date.now()}`;
    const payload = checkoutPayload(profile.id, chargeId);

    const webhookResponse = await request.post(
      `${API_URL}/api/v1/payments/webhook`,
      {
        headers: {
          "content-type": "application/json",
          "stripe-signature": signStripePayload(payload),
        },
        data: payload,
      },
    );

    expect(
      webhookResponse.ok(),
      await webhookResponse.text(),
    ).toBeTruthy();

    const webhookBody = await webhookResponse.json();
    expect(webhookBody.data.invoice_id).toBeTruthy();

    // Return through the same query-param handshake Stripe uses.
    await page.goto("/dashboard?payment=success&tab=users");

    await expect(page.getByText(PAYWALL_BANNER)).toHaveCount(0, {
      timeout: 30_000,
    });

    const findMatches = page.getByRole("button", { name: /Find Matches/i });
    await expect(findMatches).toBeEnabled();

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "5 Miles", exact: true }).click();
    await findMatches.click();

    await expect(page.getByText("Search Results")).toBeVisible({
      timeout: 30_000,
    });
  });
});
