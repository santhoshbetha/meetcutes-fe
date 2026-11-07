import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

const PAYWALL_PROFILE = {
  id: "e2e-paywall-user",
  email: "e2e.paywall@meetcutes.test",
  nickname: "e2e_paywall",
  first_name: "Paywall",
  last_name: "Viewer",
  gender: "Male",
  age: 30,
  city: "Austin",
  state: "TX",
  latitude: 30.2672,
  longitude: -97.7431,
  user_state: "active",
  terms_accepted: true,
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  around_user_count: 250,
  around_user_count_updated_at: new Date().toISOString(),
  subscription_active: false,
  subscription_expires_at: null,
  accepted_onetime_fees_amount: 50,
  images: [],
  image_urls: [],
  userid: "e2e-paywall-user",
  userhandle: "e2e_paywall",
  firstname: "Paywall",
  lastname: "Viewer",
  userstate: "active",
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
  emailsearch: true,
  phonenumbersearch: false,
  userhandlesearch: true,
  onlyhundredmileevisiblity: false,
  visibilitypreference: "both",
};

async function seedPaywallSession(page) {
  await mockEmptyNotificationInbox(page);

  await page.route("**/api/users/profile", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: PAYWALL_PROFILE }),
    }),
  );

  await page.route("**/api/v1/profiles/me**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { profile: PAYWALL_PROFILE },
      }),
    }),
  );

  await page.route("**/api/v1/locations/autocomplete**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { locations: [] } }),
    }),
  );

  await page.route("**/api/v1/events**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { events: [] } }),
    }),
  );

  await page.route("**/api/v1/payments/create-checkout-session**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          session_id: "cs_test_paywall",
          checkout_url: "https://checkout.stripe.test/cs_test_paywall",
        },
      }),
    }),
  );

  await page.route("https://checkout.stripe.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Stripe Checkout</h1></body></html>",
    }),
  );

  await page.goto("/");
  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setSession({
      token: "e2e-paywall-token",
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
        },
      },
      profiledata: profile,
    });
  }, PAYWALL_PROFILE);
}

test.describe("premium paywall", () => {
  test("blocks people search and starts Stripe checkout", async ({ page }) => {
    await seedPaywallSession(page);
    await page.goto("/dashboard?tab=users");

    await expect(
      page.getByText(/Premium Threshold Reached!/).first(),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("button", { name: /Find Matches/i }),
    ).toBeDisabled();

    const checkoutRequest = page.waitForRequest(
      "**/api/v1/payments/create-checkout-session**",
    );

    await page.getByRole("button", { name: "UNLOCK MY MATCHES" }).click();

    const request = await checkoutRequest;
    expect(request.method()).toBe("POST");
    await expect(page).toHaveURL(/checkout\.stripe\.test/);
  });

  test("blocks event search at the same threshold", async ({ page }) => {
    await seedPaywallSession(page);
    await page.goto("/dashboard?tab=search");

    await expect(
      page.getByText(/Premium Threshold Reached!/).first(),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("button", { name: /Find Events/i }).first(),
    ).toBeDisabled();
  });
});
