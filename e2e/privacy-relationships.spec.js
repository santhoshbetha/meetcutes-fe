import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * Privacy relationship coverage.
 *
 * Verifies that a blocked/muted relationship produces a graceful 404 from the
 * direct user lookup endpoint and that the Settings management directory can
 * remove relationships inline without a page refresh.
 */

const BASE_URL = "http://127.0.0.1:5180";

const PROFILE = {
  id: "e2e-privacy-viewer",
  nickname: "e2e_privacy_viewer",
  first_name: "Privacy",
  last_name: "Viewer",
  email: "e2e.privacy@meetcutes.test",
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  city: "Austin",
  state: "Texas",
  email_search: true,
  phone_number_search: false,
  user_handle_search: true,
  only_hundred_miles_visibility: false,
  visibility_preference: "both",
  questionaire_values_set: false,
  images: [],
  image_urls: [],
  userid: "e2e-privacy-viewer",
  userhandle: "e2e_privacy_viewer",
  firstname: "Privacy",
  lastname: "Viewer",
  userstate: "active",
  termsaccepted: true,
  emailsearch: true,
  phonenumbersearch: false,
  userhandlesearch: true,
  onlyhundredmileevisiblity: false,
  visibilitypreference: "both",
  questionairevaluesset: false,
};

const BLOCKED_USER = {
  id: "blocked-user-id",
  nickname: "blocked_bob",
  first_name: "Blocked",
  last_name: "Bob",
  avatar_url: null,
  image_urls: [],
  user_state: "active",
};

const MUTED_USER = {
  id: "muted-user-id",
  nickname: "muted_mary",
  first_name: "Muted",
  last_name: "Mary",
  avatar_url: null,
  image_urls: [],
  user_state: "active",
};

async function seedSession(page, path) {
  await mockEmptyNotificationInbox(page);
  await page.goto("/");

  await page.evaluate(
    async ({ profile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-privacy-token",
        user: {
          id: profile.id,
          email: profile.email,
          user_metadata: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            nickname: profile.nickname,
          },
        },
        profiledata: profile,
      });
    },
    { profile: PROFILE },
  );

  await page.goto(path);
  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(profile);
  }, PROFILE);
}

async function mockPrivacyApi(page, { blockedUsers = [], mutedUsers = [] } = {}) {
  let blocked = [...blockedUsers];
  let muted = [...mutedUsers];
  const ledger = {
    searchRequests: [],
    relationshipDeletes: [],
  };

  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/users/profile", async (route) => {
    await respond(route, { status: "success", user: PROFILE });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    await respond(route, {
      status: "success",
      data: { profile: PROFILE },
    });
  });

  await page.route("**/api/v1/events**", async (route) => {
    await respond(route, { data: { events: [] } });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await respond(route, { data: { locations: [] } });
  });

  await page.route("**/api/search/user/**", async (route) => {
    ledger.searchRequests.push(route.request().url());
    await respond(
      route,
      { status: "error", message: "User not found" },
      404,
    );
  });

  await page.route("**/api/v1/relationships/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method === "GET" && pathname.endsWith("/blocked")) {
      return respond(route, { data: { kind: "blocked", users: blocked } });
    }

    if (method === "GET" && pathname.endsWith("/muted")) {
      return respond(route, { data: { kind: "muted", users: muted } });
    }

    if (method === "DELETE") {
      const [, , , , kind, targetId] = pathname.split("/");
      ledger.relationshipDeletes.push({ kind, targetId });

      if (kind === "block") {
        blocked = blocked.filter(
          (user) => String(user.userid || user.id) !== String(targetId),
        );
      }

      if (kind === "mute") {
        muted = muted.filter(
          (user) => String(user.userid || user.id) !== String(targetId),
        );
      }

      return respond(route, {
        data: {
          relationships: { likes: [], blocks: [], mutes: [], matches: [] },
        },
      });
    }

    return respond(route, { data: {} });
  });

  return ledger;
}

test.describe("privacy relationships", () => {
  test("blocked user lookup returns a graceful No User Found state", async ({
    page,
  }) => {
    const ledger = await mockPrivacyApi(page);

    await seedSession(page, "/search");

    await expect(
      page.getByRole("heading", { name: "Search Users" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByLabel("Search Query").fill("blockedbob");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(
      page.getByText("No User Found", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("User Found!", { exact: true })).toHaveCount(0);

    expect(ledger.searchRequests).toHaveLength(1);
    expect(ledger.searchRequests[0]).toContain("blockedbob");
  });

  test("unblocking a directory record removes it inline", async ({ page }) => {
    const ledger = await mockPrivacyApi(page, {
      blockedUsers: [BLOCKED_USER],
      mutedUsers: [MUTED_USER],
    });

    await seedSession(page, "/settings");

    await expect(page.getByText("Privacy Settings")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Blocked & Muted Directory"),
    ).toBeVisible();
    await expect(page.getByText(/1 blocked, 1 muted/)).toBeVisible();

    await page
      .getByRole("button", { name: /Blocked & Muted Directory/ })
      .click();

    await expect(page.getByText("Blocked Bob")).toBeVisible();
    await expect(page.getByText("Muted Mary")).toBeVisible();

    const blockedRow = page
      .locator("div")
      .filter({ hasText: "Blocked Bob" })
      .filter({ has: page.getByRole("button", { name: "Unblock" }) })
      .last();

    await expect(
      page.getByRole("button", { name: "Unblock" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Unmute" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Unblock" }).click();

    await expect(page.getByText("Blocked Bob")).toHaveCount(0);
    await expect(page.getByText("Muted Mary")).toBeVisible();
    await expect(page.getByText(/0 blocked, 1 muted/)).toBeVisible();

    expect(ledger.relationshipDeletes).toHaveLength(1);
    expect(ledger.relationshipDeletes[0]).toMatchObject({
      kind: "block",
      targetId: BLOCKED_USER.id,
    });

    await expect(blockedRow).toHaveCount(0);
  });

  test("hide_last_name removes the surname from discovery cards", async ({
    page,
  }) => {
    await mockPrivacyApi(page);

    const hiddenUser = {
      id: "hidden-last-name-user",
      nickname: "santhosh",
      first_name: "Santhosh",
      last_name: "Betha",
      hide_last_name: true,
      gender: "Female",
      age: 28,
      city: "Austin",
      state: "TX",
      avatar_url: null,
      image_urls: [],
      user_state: "active",
    };

    const searchResponse = {
      status: "success",
      data: {
        users: [hiddenUser],
        pagination: { limit: 20, offset: 0, has_more: false },
      },
    };

    const fulfillSearch = (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(searchResponse),
      });

    await page.route("**/api/search/users**", fulfillSearch);
    await page.route("**/api/v1/search/users**", fulfillSearch);

    await seedSession(page, "/dashboard?tab=users");

    await expect(
      page.getByRole("heading", { name: "Find Connections" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("combobox").click();
    await page
      .getByRole("option", { name: "25 Miles", exact: true })
      .click();
    await page.getByRole("button", { name: "Find Matches" }).click();

    const resultsGrid = page.getByTestId("user-search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 30_000 });
    await expect(
      resultsGrid.getByRole("heading", { name: "Santhosh", exact: true }),
    ).toBeVisible();
    await expect(resultsGrid.getByText("Betha", { exact: true })).toHaveCount(0);
    await expect(
      resultsGrid.getByRole("heading", { name: /Santhosh B\./ }),
    ).toHaveCount(0);
  });
});
