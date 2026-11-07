import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * Events refresh and pagination audit.
 *
 * The suite proves that manual refresh controls use TanStack Query refetches
 * (no browser reload) and that the EventsSearch infinite query appends pages
 * using the backend pagination metadata without dropping scroll position.
 */

const EVENT_PROFILE = {
  id: "e2e-pagination-user",
  nickname: "e2e_pagination_user",
  first_name: "E2E",
  last_name: "Pagination",
  email: USERS.viewer.email,
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  city: "Austin",
  state: "Texas",
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  images: [],
  image_urls: [],
  userid: "e2e-pagination-user",
  userhandle: "e2e_pagination_user",
  firstname: "E2E",
  lastname: "Pagination",
  userstate: "active",
  termsaccepted: true,
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
};

function canonicalEvent({
  id,
  title,
  description = "",
  date = "2026-11-20",
  start = "18:00",
  end = "19:00",
}) {
  return {
    id,
    title,
    content: description,
    event_date: date,
    start_at: `${date}T${start}:00Z`,
    end_at: `${date}T${end}:00Z`,
    created_by: "seed-owner",
    location: {
      id: `loc-${id}`,
      name: `${title} Venue`,
      street: "500 Seed Ave",
      locality: "Austin",
      state: "Texas",
      postal_code: "78702",
      latitude: 30.2672,
      longitude: -97.7431,
    },
    attendees: [],
  };
}

function createState({ createdEvents = [] } = {}) {
  const pageOne = Array.from({ length: 20 }, (_, index) =>
    canonicalEvent({
      id: `evt-page1-${index}`,
      title: `Mock Search Event ${index + 1}`,
      description: `Page one event ${index + 1}`,
    }),
  );

  const pageTwo = Array.from({ length: 20 }, (_, index) =>
    canonicalEvent({
      id: `evt-page2-${index}`,
      title: `Mock Search Event ${index + 21}`,
      description: `Page two event ${index + 21}`,
    }),
  );

  return { createdEvents, pageOne, pageTwo };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serves the authenticated profile, managed events and the two paginated
 * search pages. The `offset` query parameter is the pagination cursor.
 */
async function mockEventsApi(page, state, calls) {
  const ledger = {
    created: 0,
    feed: 0,
    search: [],
    profile: 0,
    patch: 0,
    ...calls,
  };

  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/users/profile", async (route) => {
    ledger.profile += 1;
    await respond(route, { status: "success", user: EVENT_PROFILE });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    if (route.request().method() === "PATCH") {
      ledger.patch += 1;
    }

    await respond(route, {
      status: "success",
      data: { profile: EVENT_PROFILE },
    });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await respond(route, { data: { locations: [] } });
  });

  await page.route("**/api/v1/events**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname === "/api/v1/events/created" && method === "GET") {
      ledger.created += 1;
      return respond(route, { data: { events: state.createdEvents } });
    }

    if (pathname === "/api/v1/events/joined" && method === "GET") {
      return respond(route, { data: { events: [] } });
    }

    if (pathname === "/api/v1/events" && method === "GET") {
      if (url.searchParams.has("offset")) {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? 20);
        ledger.search.push({ offset, limit, url: request.url() });

        if (offset === 0) {
          return respond(route, {
            data: {
              events: state.pageOne,
              pagination: { has_more: true, limit, offset },
            },
          });
        }

        if (offset === 20) {
          // Hold page two open briefly so the loading state is observable.
          await wait(800);
          return respond(route, {
            data: {
              events: state.pageTwo,
              pagination: { has_more: false, limit, offset },
            },
          });
        }

        return respond(route, {
          data: { events: [], pagination: { has_more: false, limit, offset } },
        });
      }

      ledger.feed += 1;
      return respond(route, { data: { events: [] } });
    }

    return respond(route, { data: {} });
  });

  return ledger;
}

async function hydrateProfile(page) {
  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(profile);
  }, EVENT_PROFILE);
}

async function loginWithEventProfile(page) {
  await login(page, USERS.viewer.email);

  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    const { useSearchStore } = await import("/src/stores/searchStore.js");

    useAuthStore.getState().setProfiledata(profile);
    useSearchStore.getState().reset();
    useSearchStore.getState().setDefaultTab2("createdevents");
  }, EVENT_PROFILE);
}

test.describe("events cache refresh and pagination", () => {
  test("RefreshCw refetches managed events without a browser reload", async ({
    page,
  }) => {
    const state = createState({
      createdEvents: [
        canonicalEvent({
          id: "evt-created-seed",
          title: "Seed Managed Event",
          description: "An event owned by the signed-in user",
        }),
      ],
    });
    const calls = await mockEventsApi(page, state);

    await loginWithEventProfile(page);
    await page.goto("/dashboard?tab=events");
    await hydrateProfile(page);

    await expect(
      page.getByRole("heading", { name: "Your Events" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Seed Managed Event", exact: true }),
    ).toBeVisible();

    const createdBefore = calls.created;
    const createdRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/events/created")) {
        createdRequests.push(request.url());
      }
    });

    await page.evaluate(() => {
      window.__eventsRefreshNoReload = true;
    });

    await page
      .getByRole("button", { name: "Refresh database query rows" })
      .click();

    await expect
      .poll(() => calls.created, { timeout: 15_000 })
      .toBeGreaterThan(createdBefore);

    expect(createdRequests.length).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => window.__eventsRefreshNoReload === true),
    ).toBe(true);

    await expect(
      page.getByRole("heading", { name: "Seed Managed Event", exact: true }),
    ).toBeVisible();
  });

  test("loads 40 events across two pages and preserves scroll and cache", async ({
    page,
  }) => {
    const state = createState();
    const calls = await mockEventsApi(page, state);

    await loginWithEventProfile(page);
    await page.goto("/dashboard?tab=search");
    await hydrateProfile(page);

    await expect(
      page.getByRole("heading", { name: "Discover Events" }),
    ).toBeVisible({ timeout: 30_000 });

    const searchRequests = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === "/api/v1/events" &&
        url.searchParams.has("offset")
      ) {
        searchRequests.push(request.url());
      }
    });

    const selects = page.getByRole("combobox");
    await selects.nth(0).click();
    await page.getByRole("option", { name: "Today", exact: true }).click();
    await selects.nth(1).click();
    await page.getByRole("option", { name: "5 Miles", exact: true }).click();
    await page.getByRole("button", { name: "Find Events" }).click();

    await expect(page.getByText("Search Results")).toBeVisible();
    await expect(page.getByText("20 found", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Mock Search Event \d+$/ }),
    ).toHaveCount(20);

    expect(searchRequests.some((url) => url.includes("offset=0"))).toBe(true);
    expect(calls.search.some((request) => request.offset === 0)).toBe(true);

    const loadMore = page.getByRole("button", { name: "Load More Events" });
    await expect(loadMore).toBeVisible();
    await loadMore.scrollIntoViewIfNeeded();

    await page.evaluate(() => {
      window.__paginationNoReload = true;
    });
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await loadMore.click();

    await expect(page.getByText("Loading more...")).toBeVisible();
    await expect(page.getByText("40 found", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Mock Search Event \d+$/ }),
    ).toHaveCount(40);

    expect(searchRequests.some((url) => url.includes("offset=20"))).toBe(true);
    expect(calls.search.some((request) => request.offset === 20)).toBe(true);
    await expect(
      page.getByRole("button", { name: "Load More Events" }),
    ).toHaveCount(0);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore - 80);
    expect(
      await page.evaluate(() => window.__paginationNoReload === true),
    ).toBe(true);

    // Refresh Results must refetch the cached pages, not reload the document.
    await page.evaluate(() => {
      window.__searchRefreshNoReload = true;
    });
    const requestsBeforeRefresh = searchRequests.length;

    await page.getByRole("button", { name: /Refresh Results/ }).click();

    await expect
      .poll(() => searchRequests.length, { timeout: 15_000 })
      .toBeGreaterThan(requestsBeforeRefresh);

    expect(
      await page.evaluate(() => window.__searchRefreshNoReload === true),
    ).toBe(true);
    await expect(page.getByText("40 found", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Mock Search Event \d+$/ }),
    ).toHaveCount(40);
  });
});
