import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * User-search persistence regression coverage.
 *
 * The client currently issues `POST /api/search/users`; the v1 alias is
 * intercepted too so this suite also matches the documented
 * `GET /api/v1/search/users` contract if the route is migrated.
 *
 * `e2e.viewer` is Male in the E2E seed, so this mock pool is all Female to
 * stay visible under the opposite-gender discovery rule.
 */
const AUSTIN_USERS = [
  {
    id: "atx-demo-alex",
    nickname: "atx_demo_alex",
    first_name: "Alex",
    last_name: "Morgan",
    gender: "Female",
    age: 29,
    ethnicity: "Caucasian",
    city: "Austin",
    state: "TX",
    bio: "Coffee-fueled product thinker exploring Austin's trail network.",
    latitude: 30.2672,
    longitude: -97.7431,
    geohash: "9v6kpvcxh",
    avatar_url: null,
    image_urls: [],
    user_state: "active",
    is_active: true,
    is_approved: true,
    time_of_login: "2026-11-05T20:00:00Z",
  },
  {
    id: "atx-demo-bella",
    nickname: "atx_demo_bella",
    first_name: "Bella",
    last_name: "Cruz",
    gender: "Female",
    age: 27,
    ethnicity: "Hispanic",
    city: "Austin",
    state: "TX",
    bio: "Live music, breakfast tacos, and long walks around Lady Bird Lake.",
    latitude: 30.25,
    longitude: -97.75,
    geohash: "9v6kpdue5",
    avatar_url: null,
    image_urls: [],
    user_state: "active",
    is_active: true,
    is_approved: true,
    time_of_login: "2026-11-05T19:00:00Z",
  },
  {
    id: "atx-demo-chris",
    nickname: "atx_demo_chris",
    first_name: "Chris",
    last_name: "Okafor",
    gender: "Female",
    age: 34,
    ethnicity: "Black",
    city: "Austin",
    state: "TX",
    bio: "Weekend kayaker, amateur chef, and relentless dog-park regular.",
    latitude: 30.402,
    longitude: -97.725,
    geohash: "9v6sbnwb6",
    avatar_url: null,
    image_urls: [],
    user_state: "active",
    is_active: true,
    is_approved: true,
    time_of_login: "2026-11-05T18:00:00Z",
  },
];

const SEARCH_RESPONSE = {
  status: "success",
  data: {
    users: AUSTIN_USERS,
    pagination: { limit: 20, offset: 0, has_more: false },
  },
};

async function readZustandToken(page) {
  return page.evaluate(async () => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    return useAuthStore.getState().token;
  });
}

async function readStoredJson(page, key) {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

test.describe("user search persistence", () => {
  test("results and filters survive a sidebar tab switch without refetching", async ({
    page,
  }) => {
    let searchRequests = 0;

    const fulfillSearch = async (route) => {
      searchRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SEARCH_RESPONSE),
      });
    };

    await page.route("**/api/search/users**", fulfillSearch);
    await page.route("**/api/v1/search/users**", fulfillSearch);

    // Real login hydrates the standard Zustand session used by ProtectedRoute.
    await login(page, USERS.viewer.email);
    expect(await readZustandToken(page)).toBeTruthy();

    await page.goto("/dashboard?tab=users");
    await expect(
      page.getByRole("heading", { name: "Find Connections" }),
    ).toBeVisible({ timeout: 30_000 });

    // Distance = 25 miles, ages 24..38.
    await page.getByRole("combobox").click();
    await page
      .getByRole("option", { name: "25 Miles", exact: true })
      .click();
    await page.getByLabel("Age From").fill("24");
    await page.getByLabel("Age To").fill("38");

    await page.getByRole("button", { name: "Find Matches" }).click();

    const resultsGrid = page.getByTestId("user-search-results-grid");
    const resultCards = resultsGrid.locator('[data-slot="card"]');

    await expect(resultsGrid).toBeVisible({ timeout: 30_000 });
    await expect(resultCards).toHaveCount(3);
    await expect(page.getByText("3 matches found")).toBeVisible();

    for (const user of AUSTIN_USERS) {
      await expect(
        resultsGrid.getByRole("heading", {
          name: new RegExp(`${user.first_name} ${user.last_name.charAt(0)}\\.`),
        }),
      ).toBeVisible();
    }

    // The documented localStorage schema must be populated before leaving.
    const storedResults = await readStoredJson(page, "usersSearchResults");
    const storedSuccess = await readStoredJson(page, "usersSearchSuccess");
    expect(storedResults).toHaveLength(3);
    expect(storedSuccess).toBe(true);

    const requestsBeforeLeaving = searchRequests;
    expect(requestsBeforeLeaving).toBeGreaterThan(0);

    const sidebar = page.locator("aside");

    await sidebar.getByRole("button", { name: /My Profile/ }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=profile/);
    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible({ timeout: 30_000 });

    await sidebar.getByRole("button", { name: /Search Users/ }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=users/);
    await expect(
      page.getByRole("heading", { name: "Find Connections" }),
    ).toBeVisible();

    // The cached query repaints immediately; no duplicate proximity request.
    expect(searchRequests).toBe(requestsBeforeLeaving);

    await expect(resultCards).toHaveCount(3);
    for (const user of AUSTIN_USERS) {
      await expect(
        resultsGrid.getByRole("heading", {
          name: new RegExp(`${user.first_name} ${user.last_name.charAt(0)}\\.`),
        }),
      ).toBeVisible();
    }

    // Formik values restored from usersSearchFormValues.
    await expect(page.getByRole("combobox")).toContainText("25 Miles");
    await expect(page.getByLabel("Age From")).toHaveValue("24");
    await expect(page.getByLabel("Age To")).toHaveValue("38");
  });
});
