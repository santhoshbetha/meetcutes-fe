import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * Settings management E2E coverage.
 *
 * The app's actual write endpoints are:
 *   PATCH  /api/v1/profiles/me   (privacy/settings updates)
 *   DELETE /api/v1/profiles/me   (account deactivation)
 *
 * Both are intercepted below. The legacy `/api/v1/user/update` and
 * `/api/v1/user/deactivate` aliases are not used by the current client.
 */

const BASE_URL = "http://127.0.0.1:5180";

const LEAFLET_STUB = `
(function () {
  window.__leafletInvalidateCount = 0;

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
      return buildMap(element);
    },
    divIcon(options) {
      return { options };
    },
    tileLayer() {
      return { addTo() { return this; } };
    },
    marker() {
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

function makeProfile(overrides = {}) {
  return {
    id: "e2e-settings-user",
    nickname: "e2e_settings_user",
    first_name: "E2E",
    last_name: "Settings",
    email: "e2e.settings@meetcutes.test",
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
    default_coords_set: true,
    user_coords_set: false,
    date_of_location: null,
    date_of_coordinates: null,
    questionaire_values_set: false,
    onetime_fees_required: false,
    onetime_fees_paid: true,
    images: [],
    image_urls: [],
    // Legacy aliases consumed directly by Settings.jsx.
    userid: "e2e-settings-user",
    userhandle: "e2e_settings_user",
    firstname: "E2E",
    lastname: "Settings",
    userstate: "active",
    termsaccepted: true,
    emailsearch: true,
    phonenumbersearch: false,
    userhandlesearch: true,
    onlyhundredmileevisiblity: false,
    visibilitypreference: "both",
    defaultcoordsset: true,
    usercoordsset: false,
    dateoflocation: null,
    dateofcoordinates: null,
    questionairevaluesset: false,
    onetimefeesrequired: false,
    onetimefeespaid: true,
    ...overrides,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Installs the profile, settings update, deactivation and Leaflet mocks.
 */
async function mockSettingsApi(
  page,
  profile,
  {
    patchDelay = 0,
    deleteDelay = 0,
    blockedUsers = [],
    mutedUsers = [],
  } = {},
) {
  let currentProfile = { ...profile };
  let blockedDirectory = [...blockedUsers];
  let mutedDirectory = [...mutedUsers];
  const ledger = {
    patches: [],
    deletes: [],
    relationshipDeletes: [],
    profileGets: 0,
    feedGets: 0,
  };

  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/users/profile", async (route) => {
    ledger.profileGets += 1;
    await respond(route, { status: "success", user: currentProfile });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "PATCH") {
      const body = request.postDataJSON() ?? {};
      ledger.patches.push(body);
      currentProfile = { ...currentProfile, ...body };
      await wait(patchDelay);
      return respond(route, {
        status: "success",
        data: { profile: currentProfile },
      });
    }

    if (method === "DELETE") {
      ledger.deletes.push({
        method,
        url: request.url(),
      });
      await wait(deleteDelay);
      return respond(route, { status: "success" });
    }

    return respond(route, {
      status: "success",
      data: { profile: currentProfile },
    });
  });

  await page.route("**/api/v1/events**", async (route) => {
    ledger.feedGets += 1;
    await respond(route, { data: { events: [] } });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await respond(route, { data: { locations: [] } });
  });

  await page.route("**/api/v1/relationships/blocked", async (route) => {
    await respond(route, {
      data: { kind: "blocked", users: blockedDirectory },
    });
  });

  await page.route("**/api/v1/relationships/muted", async (route) => {
    await respond(route, {
      data: { kind: "muted", users: mutedDirectory },
    });
  });

  await page.route("**/api/v1/relationships/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method === "DELETE") {
      const [, , , , kind, targetId] = pathname.split("/");
      ledger.relationshipDeletes.push({ kind, targetId });

      if (kind === "block") {
        blockedDirectory = blockedDirectory.filter(
          (user) => String(user.userid || user.id) !== String(targetId),
        );
      }

      if (kind === "mute") {
        mutedDirectory = mutedDirectory.filter(
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
 * Seeds the native Zustand session directly, opens /settings and hydrates the
 * profile so the settings form initializes from the fixture.
 */
async function openSettings(page, profile) {
  await mockEmptyNotificationInbox(page);
  await page.goto("/");

  await page.evaluate(
    async ({ profile: sessionProfile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-settings-token",
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

  await page.goto("/settings");
  await page.evaluate(async (sessionProfile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(sessionProfile);
  }, profile);

  await expect(page.getByText("Privacy Settings")).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("settings management", () => {
  test("privacy switches aggregate into one PATCH and show feedback", async ({
    page,
  }) => {
    const profile = makeProfile();
    const ledger = await mockSettingsApi(page, profile, { patchDelay: 300 });

    await openSettings(page, profile);

    const switches = page.getByRole("switch");
    await expect(switches).toHaveCount(4);

    const expectedInitial = [true, false, true, false];
    const expectedAfter = [false, true, false, true];

    for (let index = 0; index < 4; index += 1) {
      await expect(switches.nth(index)).toHaveAttribute(
        "aria-checked",
        String(expectedInitial[index]),
      );

      await switches.nth(index).click();

      await expect(switches.nth(index)).toHaveAttribute(
        "aria-checked",
        String(expectedAfter[index]),
      );

      // Any individual toggle reveals the transient action row.
      await expect(
        page.getByRole("button", { name: "Save Changes" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText("Settings updated successfully!").first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => ledger.patches.length).toBe(1);

    expect(ledger.patches[0]).toMatchObject({
      emailsearch: false,
      phonenumbersearch: true,
      userhandlesearch: false,
      onlyhundredmileevisiblity: true,
      visibilitypreference: "both",
    });

    await expect(
      page.getByRole("button", { name: "Save Changes" }),
    ).toHaveCount(0);
  });

  test("visibility dropdown maps to the backend preference payload", async ({
    page,
  }) => {
    const profile = makeProfile();
    const ledger = await mockSettingsApi(page, profile);

    await openSettings(page, profile);

    await page.getByRole("combobox").click();
    await page
      .getByRole("option", { name: /Events Only/ })
      .click();

    await expect(page.getByRole("combobox")).toContainText("Events Only");

    await expect(
      page.getByRole("button", { name: "Save Changes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText("Settings updated successfully!").first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => ledger.patches.length).toBe(1);

    expect(ledger.patches[0]).toMatchObject({
      emailsearch: true,
      phonenumbersearch: false,
      userhandlesearch: true,
      onlyhundredmileevisiblity: false,
      visibilitypreference: "events-only",
    });
  });

  test("profile action cards open their dialogs and route correctly", async ({
    page,
  }) => {
    const profile = makeProfile({
      nickname: "",
      userhandle: "",
      date_of_location: null,
      dateoflocation: null,
      user_coords_set: false,
      usercoordsset: false,
      city: "Austin",
      state: "Texas",
    });
    await mockSettingsApi(page, profile);

    await openSettings(page, profile);

    // Set Handle — only rendered when no handle is configured.
    await page.getByRole("button", { name: "Set Handle" }).click();
    await expect(
      page.getByText("Create Handle", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByText("Create Handle", { exact: true }),
    ).toHaveCount(0);

    // Change Location — lazy-loaded dialog.
    await page.getByRole("button", { name: "Change Location" }).click();
    await expect(
      page.getByText(/Select your new Location/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByText(/Select your new Location/),
    ).toHaveCount(0);

    // View Coordinates — Leaflet-backed location dialog.
    await page.getByRole("button", { name: "View Coordinates" }).click();
    await expect(
      page.getByRole("heading", { name: "Set GPS Coordinates" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#coordinates-map-new")).toBeVisible();
    await expect(page.getByTestId("leaflet-map-stub")).toBeVisible();

    await page.getByRole("button", { name: "Close modal" }).click();
    await expect(
      page.getByRole("heading", { name: "Set GPS Coordinates" }),
    ).toHaveCount(0);

    // Questionnaire — React Router navigation.
    await page.getByRole("button", { name: "Take Questionnaire" }).click();
    await expect(page).toHaveURL(/\/questionaire$/);
    await expect(
      page.getByText("Questionnaire", { exact: true }).first(),
    ).toBeVisible();
  });

  test("danger zone deactivates, clears the session and returns home", async ({
    page,
  }) => {
    const profile = makeProfile();
    const ledger = await mockSettingsApi(page, profile, {
      deleteDelay: 700,
    });

    await openSettings(page, profile);

    await page
      .getByRole("button", { name: "Deactivate Account", exact: true })
      .click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Deactivate Account" }),
    ).toBeVisible();

    await dialog
      .getByRole("button", { name: "Deactivate Account", exact: true })
      .click();

    // The action button exposes its pending state while DELETE is held open.
    await expect(dialog.getByText("Deactivating...")).toBeVisible();
    await expect(dialog.locator(".spinner").first()).toBeVisible();

    await page.waitForURL((url) => url.pathname === "/", {
      timeout: 20_000,
    });

    await expect(
      page.getByText("Account deactivated successfully!").first(),
    ).toBeVisible();

    expect(ledger.deletes).toHaveLength(1);
    expect(ledger.deletes[0].method).toBe("DELETE");

    const session = await page.evaluate(async () => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      const state = useAuthStore.getState();

      return {
        token: state.token,
        user: state.user,
        profiledata: state.profiledata,
        authStorageKeys: Object.keys(window.localStorage).filter((key) =>
          key.includes("meetcutes.auth."),
        ),
      };
    });

    expect(session.token).toBeNull();
    expect(session.user).toBeNull();
    expect(session.profiledata).toBeNull();
    expect(session.authStorageKeys).toHaveLength(0);
  });
});
