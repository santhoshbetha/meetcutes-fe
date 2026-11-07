import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * User events workspace E2E coverage.
 *
 * ── Elixir endpoints under test ─────────────────────────────────────────────
 *   GET    /api/v1/events              public / discover feed (also used by the
 *                                      notification bell through useNotifyEvents)
 *   GET    /api/v1/events/created      events owned by the signed-in user
 *   GET    /api/v1/events/joined       events the signed-in user is attending
 *   POST   /api/v1/events              create a new event (201)
 *   PATCH  /api/v1/profiles/me         dashboard login bookkeeping
 *
 * Every request is served from the mutable `state` object below, so the suite
 * never touches the real database or uploads anything to R2/S3.
 */

const MOCK_ADDRESS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        place_id: "e2e-place-123-main-st",
        address_line1: "123 Main St",
        city: "Austin",
        state: "Texas",
        postcode: "78701",
        lat: 30.2672,
        lon: -97.7431,
        formatted: "123 Main St, Austin, TX 78701, United States of America",
      },
      geometry: {
        type: "Point",
        coordinates: [-97.7431, 30.2672],
      },
    },
  ],
};

const EVENT_PROFILE = {
  // Canonical backend shape.
  id: "e2e-events-user",
  nickname: "e2e_events_user",
  first_name: "E2E",
  last_name: "Events",
  email: USERS.viewer.email,
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  images: [],
  image_urls: [],
  // Legacy aliases consumed directly by the compatibility UI.
  userid: "e2e-events-user",
  userhandle: "e2e_events_user",
  firstname: "E2E",
  lastname: "Events",
  userstate: "active",
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
};

/**
 * Canonical event payload accepted by `toLegacyEvent`.
 */
function canonicalEvent({
  id,
  title,
  description = "",
  date = "2026-11-20",
  start = "18:00",
  end = "19:00",
  createdBy = "seed-owner",
} = {}) {
  return {
    id,
    title,
    content: description,
    event_date: date,
    start_at: `${date}T${start}:00Z`,
    end_at: `${date}T${end}:00Z`,
    created_by: createdBy,
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

function createState({ feedEvents = [], joinedEvents = [], createdEvents = [] } = {}) {
  return {
    profile: EVENT_PROFILE,
    feedEvents,
    joinedEvents,
    createdEvents,
  };
}

/**
 * Installs the authenticated-session and event API mocks for one test.
 *
 * `calls` is the assertion ledger. `createRequests` keeps every POST body so a
 * test can prove the client sent a clean, structured payload.
 */
async function mockEventsApi(page, state, calls = {}, createRequests = []) {
  const ledger = {
    feed: 0,
    created: 0,
    joined: 0,
    create: 0,
    profilePatch: 0,
    locations: 0,
    geocode: 0,
    ...calls,
  };

  await page.route("**/api/users/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: state.profile }),
    });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    if (route.request().method() === "PATCH") {
      ledger.profilePatch += 1;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { profile: state.profile },
      }),
    });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    ledger.locations += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { locations: [] } }),
    });
  });

  await page.route("**/v1/geocode/autocomplete**", async (route) => {
    ledger.geocode += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ADDRESS),
    });
  });

  await page.route("**/api/v1/events**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;

    const respond = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    const paginatedEvents = (events) => {
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const page = events.slice(offset, offset + limit);
      const hasMore = offset + page.length < events.length;
      const nextPage = hasMore ? Math.floor(offset / limit) + 2 : null;

      return {
        events: page,
        pagination: {
          total: events.length,
          limit,
          offset,
          has_more: hasMore,
          next_page: nextPage,
        },
        has_more: hasMore,
        next_page: nextPage,
      };
    };

    if (pathname === "/api/v1/events" && method === "GET") {
      ledger.feed += 1;
      return respond({ data: { events: state.feedEvents } });
    }

    if (pathname === "/api/v1/events/created" && method === "GET") {
      ledger.created += 1;
      return respond({ data: paginatedEvents(state.createdEvents) });
    }

    if (pathname === "/api/v1/events/joined" && method === "GET") {
      ledger.joined += 1;
      return respond({ data: paginatedEvents(state.joinedEvents) });
    }

    if (pathname === "/api/v1/events" && method === "POST") {
      ledger.create += 1;
      const body = request.postDataJSON() ?? {};
      createRequests.push(body);

      const created = canonicalEvent({
        id: "evt-created-e2e",
        title: body.title,
        description: body.description,
        date: body.eventdate,
        start: body.start_time,
        end: body.end_time,
        createdBy: state.profile.id,
      });

      created.location = {
        id: body.locationid,
        name: body.location,
        street: body.address1,
        locality: body.city,
        state: body.state,
        postal_code: body.zipcode,
        latitude: body.eventlat,
        longitude: body.eventlng,
      };

      state.createdEvents.push(created);
      return respond({ data: { event: created } }, 201);
    }

    // Any future event sub-route (join/leave) is acknowledged without touching
    // the real backend.
    return respond({ data: {} });
  });

  return ledger;
}

/**
 * Logs in through the real UI, then pins the Zustand session to the event
 * fixture so the workspace does not depend on the seeded database profile.
 */
async function loginWithEventProfile(page) {
  await login(page, USERS.viewer.email);

  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    const { useSearchStore } = await import("/src/stores/searchStore.js");
    const { useAutocompleteStore } = await import(
      "/src/stores/autocompleteStore.js"
    );

    useAuthStore.getState().setProfiledata(profile);
    useSearchStore.getState().reset();
    useSearchStore.getState().setDefaultTab2("createdevents");
    useAutocompleteStore.getState().reset();
  }, EVENT_PROFILE);
}

async function readEventsTab(page) {
  return page.evaluate(async () => {
    const { useSearchStore } = await import("/src/stores/searchStore.js");
    return useSearchStore.getState().defaultTab2;
  });
}

async function openEventsWorkspace(page) {
  await page.goto("/dashboard?tab=events");
  await expect(
    page.getByRole("heading", { name: "Your Events" }),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe("user events workspace", () => {
  test("syncs the tab layout without redundant event requests", async ({
    page,
  }) => {
    const feedEvents = [
      canonicalEvent({
        id: "evt-feed-1",
        title: "Feed Coffee Social",
        description: "A public discover-feed event",
      }),
      canonicalEvent({
        id: "evt-feed-2",
        title: "Feed Evening Walk",
        description: "A second discover-feed event",
      }),
    ];

    const joinedEvents = [
      canonicalEvent({
        id: "evt-joined-1",
        title: "Joined Sunday Brunch",
        description: "An event the viewer is attending",
      }),
    ];

    const createdEvents = [
      canonicalEvent({
        id: "evt-created-seed",
        title: "Seed Created Event",
        description: "An event owned by the viewer",
      }),
    ];

    const state = createState({ feedEvents, joinedEvents, createdEvents });
    const calls = await mockEventsApi(page, state);

    await loginWithEventProfile(page);
    await openEventsWorkspace(page);

    // Three-way layout: dashboard feed tab, created-events panel, attending panel.
    await expect(page.getByRole("tab", { name: "Events You Created" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Events You're Attending" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Seed Created Event", exact: true }),
    ).toBeVisible();

    expect(await readEventsTab(page)).toBe("createdevents");
    expect(calls.created).toBeGreaterThanOrEqual(1);

    const createdAfterMount = calls.created;

    // ── Registered / attending panel ────────────────────────────────────────
    await page.getByRole("tab", { name: "Events You're Attending" }).click();

    await expect(page.getByText("Your Upcoming Events")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Joined Sunday Brunch", exact: true }),
    ).toBeVisible();
    expect(await readEventsTab(page)).toBe("registeredevents");
    expect(calls.joined).toBeGreaterThanOrEqual(1);

    const joinedAfterVisit = calls.joined;

    // ── Back to the created panel ───────────────────────────────────────────
    await page.getByRole("tab", { name: "Events You Created" }).click();

    await expect(
      page.getByRole("heading", { name: "Seed Created Event", exact: true }),
    ).toBeVisible();
    expect(await readEventsTab(page)).toBe("createdevents");

    // Switching tabs must reuse the TanStack cache instead of re-fetching.
    await page.waitForTimeout(400);
    expect(calls.created).toBe(createdAfterMount);
    expect(calls.joined).toBe(joinedAfterVisit);

    // ── Discover feed tab ───────────────────────────────────────────────────
    const feedBeforeNavigation = calls.feed;
    await page.getByRole("button", { name: /Search Events/ }).click();

    await expect(page).toHaveURL(/tab=search/);
    await expect(
      page.getByRole("heading", { name: "Discover Events" }),
    ).toBeVisible();

    // Navigating between dashboard workspaces must not replay the managed
    // event queries that the previous workspace already cached.
    expect(calls.created).toBe(createdAfterMount);
    expect(calls.joined).toBe(joinedAfterVisit);

    // The discover feed itself is fetched on demand when the filters are set.
    const selects = page.getByRole("combobox");
    await selects.nth(0).click();
    await page.getByRole("option", { name: "Today", exact: true }).click();
    await selects.nth(1).click();
    await page.getByRole("option", { name: "5 Miles", exact: true }).click();
    await page.getByRole("button", { name: "Find Events" }).click();

    await expect(page.getByText("Search Results")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Feed Coffee Social", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Feed Evening Walk", exact: true }),
    ).toBeVisible();
    expect(calls.feed).toBe(feedBeforeNavigation + 1);

    // ── Back to My Events ───────────────────────────────────────────────────
    await page.getByRole("button", { name: /My Events/ }).click();

    await expect(page).toHaveURL(/tab=events/);
    await expect(
      page.getByRole("heading", { name: "Your Events" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Seed Created Event", exact: true }),
    ).toBeVisible();
    expect(await readEventsTab(page)).toBe("createdevents");

    await page.waitForTimeout(400);
    expect(calls.created).toBe(createdAfterMount);
    expect(calls.joined).toBe(joinedAfterVisit);
  });

  test("paginates created and registered tabs in 20-record chunks", async ({
    page,
  }) => {
    const createdEvents = Array.from({ length: 25 }, (_, index) =>
      canonicalEvent({
        id: `created-page-${index + 1}`,
        title: `Created Page Event ${index + 1}`,
        date: `2026-11-${String(index + 1).padStart(2, "0")}`,
      }),
    );

    const joinedEvents = Array.from({ length: 25 }, (_, index) =>
      canonicalEvent({
        id: `joined-page-${index + 1}`,
        title: `Joined Page Event ${index + 1}`,
        date: `2026-11-${String(index + 1).padStart(2, "0")}`,
      }),
    );

    const state = createState({ createdEvents, joinedEvents });
    await mockEventsApi(page, state);

    await loginWithEventProfile(page);
    await openEventsWorkspace(page);

    await expect(
      page.getByRole("heading", {
        name: "Created Page Event 20",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", {
        name: "Created Page Event 21",
        exact: true,
      }),
    ).toHaveCount(0);

    const loadCreated = page.getByRole("button", {
      name: "Load More Created Events",
    });
    await expect(loadCreated).toBeVisible();
    await loadCreated.click();

    await expect(
      page.getByRole("heading", {
        name: "Created Page Event 21",
        exact: true,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", {
        name: "Created Page Event 25",
        exact: true,
      }),
    ).toBeVisible();
    await expect(loadCreated).toHaveCount(0);

    await page.getByRole("tab", { name: "Events You're Attending" }).click();

    await expect(page.getByText("Your Upcoming Events")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Joined Page Event 20",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", {
        name: "Joined Page Event 21",
        exact: true,
      }),
    ).toHaveCount(0);

    const loadJoined = page.getByRole("button", {
      name: "Load More Registered Events",
    });
    await expect(loadJoined).toBeVisible();
    await loadJoined.click();

    await expect(
      page.getByRole("heading", {
        name: "Joined Page Event 21",
        exact: true,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", {
        name: "Joined Page Event 25",
        exact: true,
      }),
    ).toBeVisible();
    await expect(loadJoined).toHaveCount(0);
  });

  test("creates an event, refreshes the created cache, and closes the modal", async ({
    page,
  }) => {
    const state = createState({
      feedEvents: [
        canonicalEvent({
          id: "evt-feed-create",
          title: "Feed Event For Create Flow",
        }),
      ],
      joinedEvents: [],
      createdEvents: [],
    });
    const createRequests = [];
    const calls = await mockEventsApi(page, state, {}, createRequests);

    await loginWithEventProfile(page);
    await openEventsWorkspace(page);

    // Start on the created events panel with its empty state.
    await expect(page.getByText("No Events Created Yet")).toBeVisible();
    expect(await readEventsTab(page)).toBe("createdevents");

    const createdBeforeCreate = calls.created;

    await page
      .getByRole("button", { name: "Create Event", exact: true })
      .click();

    await expect(
      page.getByText("Create New Event 🎉"),
    ).toBeVisible({ timeout: 20_000 });

    // Core fields.
    await page.getByLabel("Event Title").fill("E2E Coffee Meetup");
    await page
      .getByLabel("Venue/Location Name")
      .fill("E2E Cafe");

    // Location search + selection fills address1/city/state/zip and stores the
    // location id + coordinates in the Zustand autocomplete store.
    const addressInput = page.getByTestId("address-autocomplete-input");
    await addressInput.fill("123 Main St");

    const suggestion = page.getByRole("option", { name: /123 Main St/ });
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await expect(addressInput).toHaveValue("123 Main St");

    // Date picker: choose today's cell (the form explicitly allows today).
    await page.getByRole("button", { name: /Event date/ }).click();
    const todayLabel = await page.evaluate(() =>
      new Date().toLocaleDateString(),
    );
    await page.locator(`button[data-day="${todayLabel}"]`).first().click();
    await expect(page.getByRole("button", { name: /Event date/ })).toHaveCount(0);

    await page.locator("#startTime").fill("18:00");
    await page.locator("#endTime").fill("19:00");
    await page
      .locator("#description")
      .fill("A casual coffee meetup for the E2E suite.");

    await page.getByRole("button", { name: "CREATE EVENT" }).click();

    // ── Structured payload ──────────────────────────────────────────────────
    await expect.poll(() => createRequests.length).toBe(1);

    const payload = createRequests[0];
    expect(payload).toMatchObject({
      title: "E2E Coffee Meetup",
      location: "E2E Cafe",
      address1: "123 Main St",
      city: "Austin",
      state: "Texas",
      zipcode: "78701",
      start_time: "18:00",
      end_time: "19:00",
      description: "A casual coffee meetup for the E2E suite.",
      locationid: "e2e-place-123-main-st",
    });
    expect(payload.eventdate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(payload.eventlat)).toBeCloseTo(30.2672, 4);
    expect(Number(payload.eventlng)).toBeCloseTo(-97.7431, 4);
    expect(calls.create).toBe(1);

    // ── Cache invalidation ──────────────────────────────────────────────────
    // invalidateQueries({ queryKey: ["userevents1"] }) forces the created list
    // to refetch from the mocked backend.
    await expect
      .poll(() => calls.created, { timeout: 15_000 })
      .toBeGreaterThan(createdBeforeCreate);

    // ── Modal closes, event surfaces immediately ────────────────────────────
    await expect(page.getByText("Create New Event 🎉")).toBeHidden({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: "E2E Coffee Meetup", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No Events Created Yet")).toHaveCount(0);

    expect(await readEventsTab(page)).toBe("createdevents");
    expect(state.createdEvents).toHaveLength(1);
    expect(state.createdEvents[0].title).toBe("E2E Coffee Meetup");
  });
});
