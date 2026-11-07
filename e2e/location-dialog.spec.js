import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * Location management integration coverage.
 *
 * Leaflet is loaded from unpkg by the component, so the suite intercepts both
 * the JS and CSS requests with a deterministic stub. That keeps the test
 * network-independent while still exercising the real loader, the deferred map
 * initialization, the dimension polling, and `invalidateSize()`.
 */

const BASE_URL = "http://127.0.0.1:5180";
const GEO = { latitude: 43.668, longitude: -92.9744 };

const LEAFLET_STUB = `
(function () {
  window.__leafletInvalidateCount = 0;
  window.__leafletMapInstances = 0;
  window.__leafletRemovedCount = 0;

  function buildMap(element) {
    const el = typeof element === "string" ? document.getElementById(element) : element;
    if (!el) return null;

    el.classList.add("leaflet-container");
    el.innerHTML = '<div class="leaflet-map-stub" data-testid="leaflet-map-stub" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">Leaflet map ready</div>';

    return {
      setView() { return this; },
      on() { return this; },
      off() { return this; },
      remove() {
        window.__leafletRemovedCount += 1;
        el.innerHTML = "";
        el.classList.remove("leaflet-container");
      },
      invalidateSize() {
        window.__leafletInvalidateCount += 1;
        return this;
      },
    };
  }

  window.L = {
    map(element) {
      window.__leafletMapInstances += 1;
      return buildMap(element);
    },
    divIcon(options) {
      window.__leafletIconOptions = options;
      return { options };
    },
    tileLayer() {
      return { addTo() { return this; } };
    },
    marker(_latlng, options) {
      window.__leafletMarkerOptions = options;
      return {
        addTo() { return this; },
        bindPopup() { return this; },
        openPopup() { return this; },
        on() { return this; },
        setLatLng() { return this; },
      };
    },
  };
})();
`;

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function makeProfile(overrides = {}) {
  const defaultCoords =
    overrides.default_coords_set ?? overrides.defaultcoordsset ?? true;
  const userCoords =
    overrides.user_coords_set ?? overrides.usercoordsset ?? false;

  return {
    id: "e2e-location-user",
    nickname: "e2e_location_user",
    first_name: "E2E",
    last_name: "Location",
    email: "e2e.location@meetcutes.test",
    user_state: "active",
    terms_accepted: true,
    latitude: 43.6680928,
    longitude: -92.9744896,
    city: "Austin",
    state: "Minnesota",
    questionaire_values_set: true,
    onetime_fees_required: false,
    onetime_fees_paid: true,
    default_coords_set: defaultCoords,
    user_coords_set: userCoords,
    usercoordsset: userCoords,
    defaultcoordsset: defaultCoords,
    dateofcoordinates: null,
    images: [],
    image_urls: [],
    userid: "e2e-location-user",
    userhandle: "e2e_location_user",
    firstname: "E2E",
    lastname: "Location",
    userstate: "active",
    questionairevaluesset: true,
    onetimefeesrequired: false,
    onetimefeespaid: true,
    ...overrides,
  };
}

/**
 * Mocks the profile/update layer plus the Leaflet assets for one browser page.
 */
async function mockLocationApi(page, profile) {
  let currentProfile = { ...profile };
  const ledger = {
    patch: 0,
    patches: [],
    profile: 0,
    feed: 0,
  };

  await page.route("**/api/users/profile", async (route) => {
    ledger.profile += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: currentProfile }),
    });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    const method = route.request().method();

    if (method === "PATCH") {
      ledger.patch += 1;
      const body = route.request().postDataJSON() ?? {};
      ledger.patches.push(body);
      currentProfile = { ...currentProfile, ...body };

      // The real API returns canonical snake_case flags. Keep the mock in
      // sync so mapProfileToLegacy hydrates the new custom-location state.
      if (body.usercoordsset !== undefined) {
        currentProfile.user_coords_set = body.usercoordsset;
      }
      if (body.defaultcoordsset !== undefined) {
        currentProfile.default_coords_set = body.defaultcoordsset;
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { profile: currentProfile },
      }),
    });
  });

  await page.route("**/api/v1/events**", async (route) => {
    ledger.feed += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { events: [] } }),
    });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { locations: [] } }),
    });
  });

  await page.route("**/api/v1/relationships/blocked", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { kind: "blocked", users: [] } }),
    });
  });

  await page.route("**/api/v1/relationships/muted", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { kind: "muted", users: [] } }),
    });
  });

  await page.route("**/leaflet@1.9.4/dist/leaflet.js**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: LEAFLET_STUB,
    });
  });

  await page.route("**/leaflet@1.9.4/dist/leaflet.css**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/css",
      body: ".leaflet-container { position: relative; }",
    });
  });

  return ledger;
}

/**
 * Creates the mocked browser context and seeds a signed-in Zustand session.
 */
async function createLocationSession(browser, profile, viewport) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });

  await context.grantPermissions(["geolocation"], { origin: BASE_URL });
  await context.setGeolocation(GEO);

  const page = await context.newPage();
  const ledger = await mockLocationApi(page, profile);
  await mockEmptyNotificationInbox(page);

  await page.goto("/");
  await page.evaluate(
    async ({ profile: sessionProfile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-location-token",
        user: {
          id: sessionProfile.id,
          email: sessionProfile.email,
          user_metadata: {
            first_name: sessionProfile.first_name,
            last_name: sessionProfile.last_name,
            nickname: sessionProfile.nickname,
          },
        },
        profiledata: sessionProfile,
      });
    },
    { profile },
  );

  return { context, page, ledger };
}

async function hydrateProfile(page, profile) {
  await page.evaluate(async (sessionProfile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(sessionProfile);
  }, profile);
}

/**
 * Seeds a signed-in Zustand session, opens Settings, and launches the
 * coordinates dialog.
 */
async function openLocationDialog(browser, profile, viewport) {
  const session = await createLocationSession(browser, profile, viewport);

  await session.page.goto("/settings");
  await hydrateProfile(session.page, profile);

  await session.page
    .getByRole("button", { name: "View Coordinates" })
    .click();
  await expect(
    session.page.getByRole("heading", { name: "Set GPS Coordinates" }),
  ).toBeVisible({ timeout: 20_000 });

  return session;
}

function expectFuzzedCloseTo(value, exact, tolerance = 0.2) {
  expect(Number(value)).toBeGreaterThan(exact - tolerance);
  expect(Number(value)).toBeLessThan(exact + tolerance);
}

test.describe("location dialog", () => {
  test("browser geolocation saves fuzzy coordinates and cleans up Leaflet", async ({
    browser,
  }) => {
    const profile = makeProfile({
      usercoordsset: false,
      defaultcoordsset: true,
      dateofcoordinates: null,
    });

    const { context, page, ledger } = await openLocationDialog(
      browser,
      profile,
      { width: 1440, height: 900 },
    );

    try {
      // The map is mounted in the correct container and has real dimensions.
      const map = page.locator("#coordinates-map-new");
      await expect(map).toBeVisible();

      const box = await map.boundingBox();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);

      await expect(
        page.getByRole("button", { name: "Save Location" }),
      ).toBeVisible();

      await expect(page.getByTestId("leaflet-map-stub")).toBeVisible();
      const markerOptions = await page.evaluate(
        () => window.__leafletMarkerOptions,
      );
      expect(markerOptions?.icon?.options?.className).toBe(
        "custom-leaflet-marker",
      );
      expect(markerOptions?.icon?.options?.html).toContain("<svg");
      expect(markerOptions?.icon?.options?.iconSize).toEqual([32, 32]);
      expect(
        await page.evaluate(() => window.__leafletMapInstances),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => window.__leafletInvalidateCount),
      ).toBeGreaterThan(0);

      // Browser geolocation permission was granted above; this should resolve
      // straight into the confirmation overlay.
      await page
        .getByRole("button", { name: "Use My Current Location" })
        .click();

      await expect(
        page.getByRole("heading", { name: "Confirm Location" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Confirm Location" })
        .click();

      await expect(page.getByText("Updating your location...")).toBeVisible();

      await expect(
        page.getByText("Approximate location saved successfully!").first(),
      ).toBeVisible({ timeout: 15_000 });

      await expect.poll(() => ledger.patch).toBe(1);

      const payload = ledger.patches[0];
      expect(payload).toMatchObject({
        defaultcoordsset: false,
        usercoordsset: true,
      });
      expect(payload.dateofcoordinates).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expectFuzzedCloseTo(payload.latitude, GEO.latitude);
      expectFuzzedCloseTo(payload.longitude, GEO.longitude);
      expect(Number(payload.latitude)).not.toBe(GEO.latitude);
      expect(Number(payload.longitude)).not.toBe(GEO.longitude);

      await expect(
        page.getByText("Approximate Location Set", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/Custom location set:/)).toBeVisible();
      await expect(
        page.getByText("Default Approximate Location", { exact: true }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: "Close", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Set GPS Coordinates" }),
      ).toHaveCount(0);

      // The loader must remove the injected CSS/JS on unmount.
      await expect(
        page.locator('link[data-meetcutes-leaflet="css"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('script[data-meetcutes-leaflet="js"]'),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("location status transitions from default to custom after a save", async ({
    browser,
  }) => {
    const profile = makeProfile({
      usercoordsset: false,
      defaultcoordsset: true,
      dateofcoordinates: null,
    });

    const { context, page, ledger } = await openLocationDialog(
      browser,
      profile,
      { width: 1440, height: 900 },
    );

    try {
      // Scenario A: registration-city coordinates are a system default.
      await expect(
        page.getByText("Default Approximate Location", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/Custom location set:/)).toHaveCount(0);

      await page
        .getByRole("button", { name: "Use My Current Location" })
        .click();
      await page
        .getByRole("button", { name: "Confirm Location" })
        .click();

      await expect(
        page.getByText("Approximate location saved successfully!").first(),
      ).toBeVisible({ timeout: 15_000 });

      await expect.poll(() => ledger.patch).toBe(1);
      expect(ledger.patches[0]).toMatchObject({
        defaultcoordsset: false,
        usercoordsset: true,
      });

      // Scenario B: the canonical response flags flip the UI immediately.
      await expect(
        page.getByText("Approximate Location Set", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/Custom location set:/)).toBeVisible();
      await expect(
        page.getByText("Default Approximate Location", { exact: true }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: "Close", exact: true }).click();
    } finally {
      await context.close();
    }
  });

  test("blocks a second coordinate reset inside the 30-day window", async ({
    browser,
  }) => {
    const profile = makeProfile({
      usercoordsset: true,
      defaultcoordsset: false,
      latitude: 43.7,
      longitude: -92.9,
      dateofcoordinates: daysAgo(14),
    });

    const { context, page, ledger } = await openLocationDialog(
      browser,
      profile,
      { width: 390, height: 844 },
    );

    try {
      // The manual map is intentionally hidden once custom coordinates exist.
      await expect(page.locator("#coordinates-map-new")).toHaveCount(0);

      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Reset to Default Location" }),
      ).toBeVisible();

      const patchBeforeReset = ledger.patch;
      await page
        .getByRole("button", { name: "Reset Location", exact: true })
        .click();

      await expect(
        page
          .getByText("Error! Only one reset per month is allowed!")
          .first(),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Reset to Default Location" }),
      ).toHaveCount(0);

      await page.waitForTimeout(400);
      expect(ledger.patch).toBe(patchBeforeReset);
    } finally {
      await context.close();
    }
  });

  test("renders and sizes the Leaflet map on a mobile viewport", async ({
    browser,
  }) => {
    const profile = makeProfile({
      usercoordsset: false,
      defaultcoordsset: true,
      dateofcoordinates: null,
    });

    const { context, page } = await openLocationDialog(browser, profile, {
      width: 390,
      height: 844,
    });

    try {
      const map = page.locator("#coordinates-map-new");
      await expect(map).toBeVisible();

      const box = await map.boundingBox();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThanOrEqual(250);

      await expect(page.getByTestId("leaflet-map-stub")).toBeVisible();
      expect(
        await page.evaluate(() => window.__leafletInvalidateCount),
      ).toBeGreaterThan(0);

      await expect(
        page.getByRole("button", { name: "Save Location" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Cancel", exact: true }).click();

      await expect(
        page.getByRole("heading", { name: "Set GPS Coordinates" }),
      ).toHaveCount(0);
      await expect(
        page.locator('link[data-meetcutes-leaflet="css"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('script[data-meetcutes-leaflet="js"]'),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("manual coordinate entry enforces format, proximity, and save payload", async ({
    browser,
  }) => {
    const profile = makeProfile({
      state: "Texas",
      city: "Austin",
      latitude: 30.2711286,
      longitude: -97.7436995,
      usercoordsset: false,
      defaultcoordsset: true,
      dateofcoordinates: null,
    });

    const { context, page, ledger } = await openLocationDialog(
      browser,
      profile,
      { width: 1440, height: 900 },
    );

    try {
      await expect(
        page.getByRole("heading", { name: "Manual Coordinate Entry" }),
      ).toBeVisible();

      const latitudeInput = page.locator('input[name="manualLatitude"]');
      const longitudeInput = page.locator('input[name="manualLongitude"]');
      const validateButton = page.getByRole("button", {
        name: "Validate & Apply",
      });

      await latitudeInput.fill("not-a-number");
      await longitudeInput.fill("nope");
      await validateButton.click();
      await expect(
        page.getByText(/Invalid input format\./).first(),
      ).toBeVisible();

      await latitudeInput.fill("40.7128");
      await longitudeInput.fill("-74.0060");
      await validateButton.click();
      await expect(
        page.getByText(/Location rejected! Manually entered coordinates/).first(),
      ).toBeVisible();
      await expect(latitudeInput).toHaveValue("");
      await expect(longitudeInput).toHaveValue("");

      await latitudeInput.fill("30.2672");
      await longitudeInput.fill("-97.7431");
      await validateButton.click();

      await expect(
        page.getByText("Manual coordinates validated and applied to the map.").first(),
      ).toBeVisible();
      await expect(page.getByText("30.267200, -97.743100")).toBeVisible();

      await page.getByRole("button", { name: "Save Location" }).click();
      await expect(
        page.getByRole("heading", { name: "Confirm Location" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Confirm Location" }).click();

      await expect(
        page.getByText("Approximate location saved successfully!").first(),
      ).toBeVisible({ timeout: 15_000 });

      expect(ledger.patches).toHaveLength(1);
      expectFuzzedCloseTo(ledger.patches[0].latitude, 30.2672);
      expectFuzzedCloseTo(ledger.patches[0].longitude, -97.7431);
      expect(ledger.patches[0].usercoordsset).toBe(true);
    } finally {
      await context.close();
    }
  });

  test("sidebar My Location link opens the standalone location route", async ({
    browser,
  }) => {
    const profile = makeProfile({
      usercoordsset: false,
      defaultcoordsset: true,
      dateofcoordinates: null,
    });

    const { context, page } = await createLocationSession(browser, profile, {
      width: 1440,
      height: 900,
    });

    try {
      await page.goto("/dashboard");
      await hydrateProfile(page, profile);

      await page.getByRole("button", { name: /My Location/ }).click();

      await expect(page).toHaveURL(/\/dashboard\/location$/);
      await expect(
        page.getByRole("heading", { name: "Set GPS Coordinates" }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("#coordinates-map-new")).toBeVisible();
      await expect(page.getByTestId("leaflet-map-stub")).toBeVisible();

      const saveLocation = page.getByRole("button", {
        name: "Save Location",
      });
      await saveLocation.scrollIntoViewIfNeeded();
      await expect(saveLocation).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeVisible();

      // The dashboard shell (and therefore the sidebar) must stay mounted.
      await expect(page.locator("aside")).toBeVisible();

      const myLocationNav = page
        .locator("aside nav button")
        .filter({ hasText: "My Location" });
      const myProfileNav = page
        .locator("aside nav button")
        .filter({ hasText: "My Profile" });

      await expect(myLocationNav).toHaveClass(/bg-primary/);
      await expect(myProfileNav).not.toHaveClass(/bg-primary/);

      await page
        .getByRole("button", { name: "Back to Dashboard" })
        .click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator("aside")).toBeVisible();
      await expect(myProfileNav).toHaveClass(/bg-primary/);
      await expect(myLocationNav).not.toHaveClass(/bg-primary/);
    } finally {
      await context.close();
    }
  });
});
