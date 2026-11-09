import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * End-to-end signup, onboarding, and dashboard landing coverage.
 *
 * The suite runs serially against one clean browser context so the journey is
 * identical to a first-time visitor: register from the public landing page,
 * pin a location through the Geoapify autocomplete step, answer the slider
 * questionnaire, then land on the discovery dashboard.
 *
 * External dependencies are intercepted at the network boundary:
 *   - Geoapify geocoding autocomplete -> fixed Austin, Texas coordinate.
 *   - POST /api/users/register        -> audited payload + session token.
 *   - Profile reads/writes            -> in-memory stateful profile.
 *   - Event search pages              -> deterministic two-page infinite grid.
 */

const BASE_URL = "http://127.0.0.1:5180";
const SESSION_TOKEN = "e2e-signup-session-token";
const PASSWORD = "SignupFlow!2026";

const AUSTIN = {
  locationid: "geoapify-austin-tx",
  address1: "Austin, TX, USA",
  city: "Austin",
  state: "Texas",
  zipcode: "78701",
  latitude: 30.2672,
  longitude: -97.7431,
  name: "Austin",
  formatted: "Austin, TX, USA",
};

const GEOAPIFY_FEATURE = {
  properties: {
    place_id: AUSTIN.locationid,
    address_line1: AUSTIN.address1,
    city: AUSTIN.city,
    state: AUSTIN.state,
    postcode: AUSTIN.zipcode,
    lat: AUSTIN.latitude,
    lon: AUSTIN.longitude,
    name: AUSTIN.name,
    formatted: AUSTIN.formatted,
  },
  geometry: {
    coordinates: [AUSTIN.longitude, AUSTIN.latitude],
  },
};

const stamp = Date.now();
const UNIQUE_EMAIL = `test.user.${stamp}@meetcutes.test`;
const UNIQUE_PHONE = String(stamp).slice(-10).padStart(10, "0");

function canonicalEvent(id, title, startAt, endAt) {
  return {
    id,
    title,
    content: `${title} description`,
    event_date: startAt.slice(0, 10),
    start_at: startAt,
    end_at: endAt,
    status: "PUBLISHED",
    attendees_count: 1,
    attendees: [],
    created_by: "signup-flow-owner",
    has_age_restriction: false,
    location: {
      id: `location-${id}`,
      name: "Zilker Park",
      street: "2100 Barton Springs Rd",
      locality: "Austin",
      state: "TX",
      postal_code: "78704",
      latitude: AUSTIN.latitude,
      longitude: AUSTIN.longitude,
    },
  };
}

const EVENT_START = dayjs().add(3, "day").format("YYYY-MM-DD");

test.describe.serial("signup, onboarding, and dashboard landing", () => {
  test.describe.configure({ timeout: 120_000 });

  let context;
  let page;
  let profile;
  let registrationPayloads;
  let onboardingPatches;
  let questionnairePatches;
  let eventPageRequests;
  let pageErrors;

  const baseProfile = () => ({
    id: "e2e-signup-user",
    email: UNIQUE_EMAIL,
    nickname: "signup_flow_user",
    first_name: "Test",
    last_name: "User",
    gender: "Male",
    ethnicity: "Asian",
    age: 24,
    birth_year: 2002,
    city: "Austin",
    state: "Texas",
    phone_number: UNIQUE_PHONE,
    latitude: AUSTIN.latitude,
    longitude: AUSTIN.longitude,
    geohash: null,
    default_coords_set: false,
    user_coords_set: false,
    exact_coords_set: false,
    user_state: "active",
    is_active: true,
    is_approved: true,
    terms_accepted: true,
    questionaire_values: null,
    questionaire_values_set: false,
    onetime_fees_required: false,
    onetime_fees_paid: true,
    subscription_active: true,
    around_user_count: 0,
    images: [],
    image_urls: [],
  });

  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  test.beforeAll(async ({ browser }) => {
    registrationPayloads = [];
    onboardingPatches = [];
    questionnairePatches = [];
    eventPageRequests = [];
    pageErrors = [];
    profile = baseProfile();

    context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();

    page.on("pageerror", (error) => pageErrors.push(error.message));

    await mockEmptyNotificationInbox(page);

    // A 404 here forces the Radix avatar into its fallback state so the
    // generated initials token is observable in the DOM.
    await page.route("**/placeholder-user.jpg", (route) =>
      route.fulfill({
        status: 404,
        contentType: "image/jpeg",
        body: "",
      }),
    );

    // Geoapify geocoding autocomplete (called directly by the browser).
    await page.route("**/api.geoapify.com/**", (route) => {
      const url = new URL(route.request().url());
      const text = (url.searchParams.get("text") ?? "").toLowerCase();

      return respond(route, {
        features: text.includes("austin") ? [GEOAPIFY_FEATURE] : [],
      });
    });

    // Credential registration audit point.
    await page.route("**/api/users/register", (route) => {
      if (route.request().method() !== "POST") {
        return respond(route, { status: "error", message: "Not found" }, 404);
      }

      const body = route.request().postDataJSON() ?? {};
      registrationPayloads.push(body);

      return respond(
        route,
        {
          status: "success",
          message: "Registration successful.",
          data: { user: profile },
          token: SESSION_TOKEN,
        },
        201,
      );
    });

    // AuthContext hydrates the signed-in profile from this legacy endpoint.
    await page.route("**/api/users/profile", (route) =>
      respond(route, { status: "success", user: profile }),
    );

    // Canonical profile reads/writes used by onboarding and the questionnaire.
    await page.route("**/api/v1/profiles/me**", (route) => {
      const request = route.request();
      const method = request.method();

      if (method === "GET") {
        return respond(route, {
          status: "success",
          data: { profile },
        });
      }

      if (method !== "PATCH") {
        return respond(route, { status: "error", message: "Not found" }, 404);
      }

      const body = request.postDataJSON() ?? {};
      const next = { ...profile };

      if (body.questionairevaluesset !== undefined) {
        next.questionaire_values_set = Boolean(body.questionairevaluesset);
        next.questionaire_values = body.questionairevalues ?? next.questionaire_values;
        questionnairePatches.push(body);
      }

      if (body.questionaire_values_set !== undefined) {
        next.questionaire_values_set = Boolean(body.questionaire_values_set);
        next.questionaire_values = body.questionaire_values ?? next.questionaire_values;
      }

      if (body.raw_lat !== undefined && body.raw_lon !== undefined) {
        next.default_coords_set = true;
        next.user_coords_set = false;
        next.exact_coords_set = false;
        next.latitude = Number(body.raw_lat);
        next.longitude = Number(body.raw_lon);
        next.geohash = "9v6kp5signupflow";
        next.date_of_coordinates = new Date().toISOString();
        onboardingPatches.push(body);
      }

      if (body.city !== undefined) next.city = body.city;
      if (body.state !== undefined) next.state = body.state;
      if (body.timeoflogin !== undefined) next.time_of_login = body.timeoflogin;

      Object.entries(body).forEach(([key, value]) => {
        if (
          ![
            "questionairevalues",
            "questionairevaluesset",
            "questionaire_values",
            "questionaire_values_set",
            "raw_lat",
            "raw_lon",
            "timeoflogin",
          ].includes(key)
        ) {
          next[key] = value;
        }
      });

      profile = next;

      return respond(route, {
        status: "success",
        message: "Profile updated successfully",
        data: { profile },
      });
    });

    await page.route("**/api/v1/locations/autocomplete**", (route) =>
      respond(route, { status: "success", data: { locations: [] } }),
    );

    await page.route("**/api/v1/relationships/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const kind = path.split("/").filter(Boolean).at(-1);

      return respond(route, { status: "success", data: { kind, users: [] } });
    });

    // Infinite event search: page 0 has two rows, page 1 has one row.
    await page.route("**/api/v1/events**", (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (url.pathname.endsWith("/check-fatigue")) {
        return respond(route, { is_fatigued: false });
      }

      if (url.pathname !== "/api/v1/events" || method !== "GET") {
        return respond(route, {
          status: "success",
          data: {
            events: [],
            pagination: { total: 0, limit: 20, offset: 0, has_more: false },
          },
        });
      }

      eventPageRequests.push(url);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      if (offset === 0) {
        return respond(route, {
          status: "success",
          data: {
            events: [
              canonicalEvent(
                "signup-event-coffee",
                "Signup Coffee Meetup",
                `${EVENT_START}T18:00:00Z`,
                `${EVENT_START}T20:00:00Z`,
              ),
              canonicalEvent(
                "signup-event-walk",
                "Signup River Walk",
                `${EVENT_START}T16:00:00Z`,
                `${EVENT_START}T17:00:00Z`,
              ),
            ],
            pagination: { total: 3, limit: 20, offset: 0, has_more: true },
          },
        });
      }

      return respond(route, {
        status: "success",
        data: {
          events: [
            canonicalEvent(
              "signup-event-social",
              "Signup Sunset Social",
              `${EVENT_START}T21:00:00Z`,
              `${EVENT_START}T23:00:00Z`,
            ),
          ],
          pagination: { total: 3, limit: 20, offset: 20, has_more: false },
        },
      });
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("Test Case 1: blocks empty registration, then persists the session", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Signup", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Sign Up for MeetCutes" })).toBeVisible();
    await expect(page.getByText("Join MeetCutes")).toBeVisible();

    // Step A: Formik/Yup must own validation and stop the network call.
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page.getByText("First name is required")).toBeVisible();
    await expect(page.getByText("Phone number is required")).toBeVisible();

    await page.waitForTimeout(250);
    expect(registrationPayloads).toHaveLength(0);

    // A short password must surface the minimum-length message instead of
    // reaching the network.
    await page.locator("#password").fill("short");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible();
    expect(registrationPayloads).toHaveLength(0);

    // Step B: populate unique credentials and submit.
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("User");
    await page.getByLabel("Phone number").fill(UNIQUE_PHONE);
    await page.getByLabel("Email address").fill(UNIQUE_EMAIL);
    await page.locator("#password").fill(PASSWORD);

    await page.getByText("Select your gender", { exact: true }).click();
    await page.getByRole("option", { name: "Male", exact: true }).click();

    await page.getByText("Select your state", { exact: true }).click();
    await page.getByRole("button", { name: "Texas", exact: true }).click();

    await page.getByText("Select your city", { exact: true }).click();
    await page.getByRole("button", { name: "Austin", exact: true }).click();

    await page.getByLabel("Ethnicity").click();
    await page.getByRole("option", { name: "Asian", exact: true }).click();

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/onboarding\/location$/, {
      timeout: 30_000,
    });

    expect(registrationPayloads).toHaveLength(1);
    const registeredUser = registrationPayloads[0]?.user;
    expect(registeredUser).toMatchObject({
      email: UNIQUE_EMAIL,
      first_name: "Test",
      last_name: "User",
      phone_number: UNIQUE_PHONE,
      gender: "Male",
      state: "Texas",
      city: "Austin",
      ethnicity: "Asian",
      password: PASSWORD,
      password_confirmation: PASSWORD,
    });

    const session = await page.evaluate(async () => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      const state = useAuthStore.getState();
      return { token: state.token, email: state.user?.email ?? null };
    });

    expect(session.token).toBe(SESSION_TOKEN);
    expect(session.email).toBe(UNIQUE_EMAIL);
  });

  test("Test Case 2: pins Austin and submits the qualitative questionnaire", async () => {
    await expect(page.getByTestId("onboarding-location-step")).toBeVisible();

    const nextStep = page.getByTestId("onboarding-next-step");
    await expect(nextStep).toBeDisabled();

    // Step A: Geoapify autocomplete -> Austin, Texas.
    await page.getByTestId("address-autocomplete-input").fill("Austin");

    const austinOption = page.getByRole("option", {
      name: /Austin, Texas/i,
    });
    await expect(austinOption).toBeVisible({ timeout: 15_000 });
    await austinOption.click();

    await expect(
      page.getByTestId("onboarding-selected-location"),
    ).toContainText("Austin");
    await expect(page.getByTestId("onboarding-coordinates")).toHaveText(
      "30.2672, -97.7431",
    );
    await expect(nextStep).toBeEnabled();

    const onboardingPatchPromise = page.waitForRequest(
      (request) =>
        request.method() === "PATCH" &&
        request.url().includes("/api/v1/profiles/me"),
    );

    await nextStep.click();

    const onboardingPatch = await onboardingPatchPromise;
    expect(onboardingPatch.postDataJSON()).toMatchObject({
      city: "Austin",
      state: "Texas",
      raw_lat: AUSTIN.latitude,
      raw_lon: AUSTIN.longitude,
    });
    expect(onboardingPatches).toHaveLength(1);

    await expect(page).toHaveURL(/\/questionnaire$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Core Mindset & Lifestyle" }),
    ).toBeVisible();

    // Step B: drag the first qualitative slider past 75%.
    const question = page.getByTestId("questionnaire-question-q1");
    await expect(question).toBeVisible({ timeout: 30_000 });
    await question.scrollIntoViewIfNeeded();

    const track = question.locator('[data-slot="slider-track"]');
    const thumb = question.locator('[data-slot="slider-thumb"]');
    const trackBox = await track.boundingBox();
    const thumbBox = await thumb.boundingBox();

    expect(trackBox).not.toBeNull();
    expect(thumbBox).not.toBeNull();

    const dragY = thumbBox.y + thumbBox.height / 2;
    await page.mouse.move(thumbBox.x + thumbBox.width / 2, dragY);
    await page.mouse.down();
    await page.mouse.move(trackBox.x + trackBox.width * 0.9, dragY, {
      steps: 18,
    });
    await page.mouse.up();

    await expect(
      question.getByText("Strongly lean right", { exact: true }),
    ).toBeVisible();

    // No raw score/percentage strings may leak into the qualitative UI.
    await expect(question.getByText(/%/)).toHaveCount(0);
    await expect(question.getByText(/^\d+$/)).toHaveCount(0);
    await expect(question).not.toContainText("75%");
    await expect(question).not.toContainText("85%");

    const questionnairePatchPromise = page.waitForRequest((request) => {
      if (
        request.method() !== "PATCH" ||
        !request.url().includes("/api/v1/profiles/me")
      ) {
        return false;
      }

      return request.postDataJSON()?.questionairevaluesset === true;
    });

    await expect(page.getByTestId("questionnaire-submit")).toBeVisible();
    await page.getByTestId("questionnaire-submit").click();

    const questionnairePatch = await questionnairePatchPromise;
    const questionnaireBody = questionnairePatch.postDataJSON();

    expect(questionnaireBody.questionairevaluesset).toBe(true);
    expect(questionnaireBody.questionairevalues).toBeTruthy();
    expect(questionnaireBody.questionairevalues.q1).toBeGreaterThanOrEqual(80);
    expect(questionnaireBody.questionairevalues.q1).toBeLessThanOrEqual(100);
    expect(questionnairePatches).toHaveLength(1);

    await expect(page).toHaveURL(/\/dashboard\/search$/, { timeout: 30_000 });
  });

  test("Test Case 3: lands on discovery with sidebar, initials, and infinite results", async () => {
    // Routing landed on the canonical discovery path.
    await expect(page).toHaveURL(/\/dashboard\/search$/);
    await expect(
      page.getByRole("heading", { name: "Discover Events" }),
    ).toBeVisible({ timeout: 30_000 });

    // The sidebar shell and the generated initials avatar are both mounted.
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /Search Events/ }),
    ).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /My Profile/ })).toBeVisible();
    await expect(page.getByText("TU", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // Trigger the baseline infinite search fetch.
    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: "All (from today)", exact: true })
      .click();
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "25 Miles", exact: true }).click();

    const firstPageRequest = page.waitForRequest((request) => {
      if (request.method() !== "GET") return false;
      const url = new URL(request.url());
      return (
        url.pathname === "/api/v1/events" &&
        url.searchParams.has("start_date") &&
        url.searchParams.get("offset") === "0"
      );
    });

    await page.getByRole("button", { name: "Find Events" }).first().click();
    await firstPageRequest;

    await expect(page.getByText("Signup Coffee Meetup")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Signup River Walk")).toBeVisible();

    // Infinite-scroll continuation loads the second page.
    const loadMore = page.getByRole("button", { name: "Load More Events" });
    await expect(loadMore).toBeVisible();

    const secondPageRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/v1/events" &&
        url.searchParams.get("offset") === "20"
      );
    });

    await loadMore.click();
    await secondPageRequest;

    await expect(page.getByText("Signup Sunset Social")).toBeVisible({
      timeout: 20_000,
    });
    expect(eventPageRequests.length).toBeGreaterThanOrEqual(2);

    // No white screen, no uncaught render exception.
    await expect(page.locator("#root")).not.toBeEmpty();
    expect(pageErrors).toEqual([]);
  });
});
