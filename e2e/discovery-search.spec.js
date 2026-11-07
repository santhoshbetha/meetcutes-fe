import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

const MALE_VIEWER = {
  id: "discovery-male-viewer",
  email: "discovery.male@meetcutes.test",
  nickname: "discovery_male",
  first_name: "Discovery",
  last_name: "Viewer",
  gender: "Male",
  age: 30,
  city: "Austin",
  state: "TX",
  latitude: 30.2672,
  longitude: -97.7431,
  geohash: "9v6kpvcxh",
  bio: "Male discovery viewer",
  user_state: "active",
  is_active: true,
  is_approved: true,
  is_confirmed: true,
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  default_coords_set: true,
  user_coords_set: false,
  previous_events_attendees_date: null,
  images: [],
  image_urls: [],
  settings: { visibility_preference: "both" },
  time_of_login: "2026-11-05T20:00:00Z",
  inserted_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  // Legacy aliases used directly by Dashboard/UsersSearch.
  userid: "discovery-male-viewer",
  userhandle: "discovery_male",
  firstname: "Discovery",
  lastname: "Viewer",
  userstate: "active",
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
  defaultcoordsset: true,
  usercoordsset: false,
  timeoflogin: "2026-11-05T20:00:00Z",
};

const SAME_GENDER_USER = {
  id: "same-gender-male",
  nickname: "same_gender_male",
  first_name: "SameGender",
  last_name: "Male",
  gender: "Male",
  age: 32,
  city: "Austin",
  state: "TX",
  bio: "Should be filtered out for a Male viewer.",
  latitude: 30.268,
  longitude: -97.74,
  avatar_url: null,
  image_urls: [],
  user_state: "active",
  is_active: true,
  is_approved: true,
  time_of_login: "2026-11-05T18:00:00Z",
};

const OPPOSITE_GENDER_USER = {
  id: "opposite-gender-female",
  nickname: "opposite_gender_female",
  first_name: "Opposite",
  last_name: "Female",
  gender: "Female",
  age: 28,
  city: "Austin",
  state: "TX",
  bio: "The only card that should paint for a Male viewer.",
  latitude: 30.25,
  longitude: -97.75,
  avatar_url: null,
  image_urls: [],
  user_state: "active",
  is_active: true,
  is_approved: true,
  time_of_login: "2026-11-05T19:00:00Z",
};

const SEARCH_RESPONSE = {
  status: "success",
  data: {
    users: [SAME_GENDER_USER, OPPOSITE_GENDER_USER],
    pagination: { limit: 20, offset: 0, has_more: false },
  },
};

async function mockDiscoveryApi(page) {
  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/users/profile", (route) =>
    respond(route, { status: "success", user: MALE_VIEWER }),
  );

  await page.route("**/api/v1/profiles/me**", (route) =>
    respond(route, { status: "success", data: { profile: MALE_VIEWER } }),
  );

  await page.route("**/api/v1/locations/autocomplete**", (route) =>
    respond(route, { data: { locations: [] } }),
  );

  await page.route("**/api/v1/events**", (route) =>
    respond(route, { data: { events: [] } }),
  );

  await page.route("**/api/v1/relationships/blocked", (route) =>
    respond(route, { data: { kind: "blocked", users: [] } }),
  );

  await page.route("**/api/v1/relationships/muted", (route) =>
    respond(route, { data: { kind: "muted", users: [] } }),
  );
}

async function seedMaleSession(page) {
  await mockEmptyNotificationInbox(page);
  await page.goto("/");

  await page.evaluate(
    async ({ profile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-discovery-token",
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
    { profile: MALE_VIEWER },
  );

  await page.goto("/dashboard?tab=users");

  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(profile);
  }, MALE_VIEWER);
}

test.describe("discovery search gender scoping", () => {
  test("a Male viewer only sees Female result cards", async ({ page }) => {
    let searchBody = null;

    const fulfillSearch = async (route) => {
      searchBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SEARCH_RESPONSE),
      });
    };

    // Current client route plus the documented v1 discovery alias.
    await page.route("**/api/search/users**", fulfillSearch);
    await page.route("**/api/v1/search/users**", fulfillSearch);

    await mockDiscoveryApi(page);
    await seedMaleSession(page);

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
    await expect(resultsGrid.locator('[data-slot="card"]')).toHaveCount(1);

    await expect(
      resultsGrid.getByRole("heading", { name: "Opposite F." }),
    ).toBeVisible();

    await expect(
      resultsGrid.getByRole("heading", { name: "SameGender M." }),
    ).toHaveCount(0);

    await expect(page.getByText("1 matches found")).toBeVisible();
    expect(searchBody?.gender).toBe("Male");
  });

  test("a mobile profile dialog opens in-tab and returns to discovery", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const fulfillSearch = async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SEARCH_RESPONSE),
      });
    };

    await page.route("**/api/search/users**", fulfillSearch);
    await page.route("**/api/v1/search/users**", fulfillSearch);
    await mockDiscoveryApi(page);

    await page.route(
      "**/api/v1/profiles/opposite-gender-female**",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            data: { profile: OPPOSITE_GENDER_USER },
          }),
        }),
    );

    await page.route("**/api/v1/relationships**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { relationships: { likes: [], blocks: [], mutes: [], matches: [] } },
        }),
      }),
    );

    await seedMaleSession(page);

    await page.getByRole("combobox").click();
    await page
      .getByRole("option", { name: "25 Miles", exact: true })
      .click();
    await page.getByRole("button", { name: "Find Matches" }).click();

    const resultsGrid = page.getByTestId("user-search-results-grid");
    await expect(resultsGrid).toBeVisible({ timeout: 30_000 });
    await resultsGrid.getByRole("heading", { name: "Opposite F." }).click();

    await page.getByRole("button", { name: "Open full profile" }).click();

    await expect(page).toHaveURL(/\/user\/opposite-gender-female$/);
    await expect(
      page.getByRole("button", { name: "Back to Discovery" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Back to Discovery" }).click();

    await expect(
      page.getByRole("heading", { name: "Find Connections" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("user-search-results-grid")).toBeVisible();
    await expect(page.getByText("1 matches found")).toBeVisible();
  });
});
