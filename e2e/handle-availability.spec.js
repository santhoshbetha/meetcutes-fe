import { test, expect } from "@playwright/test";
import {
  apiLogin,
  API_URL,
  authHeaders,
  mockEmptyNotificationInbox,
  USERS,
} from "./helpers.js";

test.describe("handle availability", () => {
  test("reports taken, free, invalid, and case-insensitive handles", async ({
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);

    const check = async (handle) => {
      const response = await request.get(
        `${API_URL}/api/v1/users/check-handle?handle=${encodeURIComponent(handle)}`,
        { headers: authHeaders(token) },
      );

      expect(response.ok(), await response.text()).toBeTruthy();
      return response.json();
    };

    const taken = await check(USERS.viewer.handle);
    expect(taken.available).toBe(false);

    const free = await check(`e2e${String(Date.now()).slice(-8)}`);
    expect(free.available).toBe(true);

    // Uniqueness is case-insensitive.
    const differentCase = await check(USERS.viewer.handle.toUpperCase());
    expect(differentCase.available).toBe(false);

    const invalid = await check("bad");
    expect(invalid.available).toBe(false);
  });

  test("assigns a free handle and restores the original", async ({ request }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const original = USERS.viewer.handle;
    const candidate = `e2e${String(Date.now()).slice(-10)}`;

    try {
      const assign = await request.patch(
        `${API_URL}/api/v1/users/me/set-handle`,
        {
          headers: authHeaders(token),
          data: { handle: candidate },
        },
      );

      expect(assign.ok(), await assign.text()).toBeTruthy();
      const assigned = await assign.json();
      expect(assigned.data.profile.nickname).toBe(candidate);

      const profile = await request.get(`${API_URL}/api/v1/profiles/me`, {
        headers: authHeaders(token),
      });
      expect((await profile.json()).data.profile.nickname).toBe(candidate);

      // Re-submitting the same handle with different case is allowed for the
      // owner (the uniqueness check excludes the current user).
      const sameOwner = await request.patch(
        `${API_URL}/api/v1/users/me/set-handle`,
        {
          headers: authHeaders(token),
          data: { handle: candidate.toUpperCase() },
        },
      );
      expect(sameOwner.status()).toBe(200);
    } finally {
      const restore = await request.patch(
        `${API_URL}/api/v1/users/me/set-handle`,
        {
          headers: authHeaders(token),
          data: { handle: original },
        },
      );
      expect(restore.ok(), await restore.text()).toBeTruthy();
    }
  });

  test("debounces availability, saves the handle, and closes the dialog", async ({
    page,
  }) => {
    const profile = {
      id: "e2e-handle-user",
      email: "e2e.handle@meetcutes.test",
      nickname: null,
      first_name: "Handle",
      last_name: "Tester",
      gender: "Female",
      age: 30,
      city: "Austin",
      state: "TX",
      latitude: 30.2672,
      longitude: -97.7431,
      user_state: "active",
      is_active: true,
      is_approved: true,
      questionaire_values_set: true,
      onetime_fees_required: false,
      onetime_fees_paid: true,
      default_coords_set: true,
      user_coords_set: false,
      images: [],
      image_urls: [],
      settings: { visibility_preference: "both" },
      userid: "e2e-handle-user",
      userhandle: null,
      firstname: "Handle",
      lastname: "Tester",
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

    let availabilityChecks = 0;
    let submittedHandle = null;

    await page.route("**/api/users/profile", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", user: profile }),
      }),
    );

    await page.route("**/api/v1/profiles/me**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: { profile } }),
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

    await page.route("**/api/v1/relationships/blocked", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { kind: "blocked", users: [] } }),
      }),
    );

    await page.route("**/api/v1/relationships/muted", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { kind: "muted", users: [] } }),
      }),
    );

    await page.route("**/api/v1/users/check-handle**", async (route) => {
      availabilityChecks += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true }),
      });
    });

    await page.route("**/api/v1/users/me/set-handle", async (route) => {
      const body = route.request().postDataJSON() ?? {};
      submittedHandle = body.handle;
      const updated = {
        ...profile,
        nickname: body.handle,
        userhandle: body.handle,
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { profile: updated },
        }),
      });
    });

    await mockEmptyNotificationInbox(page);
    await page.goto("/");
    await page.evaluate(async (sessionProfile) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-handle-token",
        user: {
          id: sessionProfile.id,
          email: sessionProfile.email,
          user_metadata: {
            first_name: sessionProfile.first_name,
            last_name: sessionProfile.last_name,
          },
        },
        profiledata: sessionProfile,
      });
    }, profile);

    await page.goto("/settings");
    await page.evaluate(async (sessionProfile) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setProfiledata(sessionProfile);
    }, profile);

    await page.getByRole("button", { name: "Set Handle" }).click();

    const input = page.locator('input[name="handletext"]');
    await expect(input).toBeVisible();

    // Type quickly: the 400ms debounce should collapse this into one request.
    await input.pressSequentially("freshhandle", { delay: 40 });

    await expect(page.getByText("Handle is available.")).toBeVisible({
      timeout: 15_000,
    });
    expect(availabilityChecks).toBe(1);

    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByText("Username handle assigned successfully!").first(),
    ).toBeVisible({ timeout: 15_000 });
    expect(submittedHandle).toBe("freshhandle");

    await expect(page.getByText("@freshhandle")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Set Handle" }),
    ).toHaveCount(0);
  });
});
