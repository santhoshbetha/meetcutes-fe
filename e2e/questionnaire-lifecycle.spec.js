import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

const BASE_URL = "http://127.0.0.1:5180";
const USER_A_ID = "questionnaire-user-a";

const USER_A = {
  id: USER_A_ID,
  userid: USER_A_ID,
  nickname: "questionnaire_a",
  userhandle: "questionnaire_a",
  first_name: "Alex",
  last_name: "Taker",
  firstname: "Alex",
  lastname: "Taker",
  email: "questionnaire.a@meetcutes.test",
  gender: "Male",
  age: 30,
  city: "Austin",
  state: "TX",
  latitude: 30.2672,
  longitude: -97.7431,
  user_state: "active",
  userstate: "active",
  terms_accepted: true,
  termsaccepted: true,
  questionaire_values: {},
  questionaire_values_set: false,
  questionairevalues: {},
  questionairevaluesset: false,
  onetime_fees_required: false,
  onetimefeesrequired: false,
  onetime_fees_paid: true,
  onetimefeespaid: true,
  images: [],
  image_urls: [],
};

const USER_B = {
  id: "questionnaire-user-b",
  userid: "questionnaire-user-b",
  nickname: "questionnaire_b",
  userhandle: "questionnaire_b",
  first_name: "Bailey",
  last_name: "Viewer",
  firstname: "Bailey",
  lastname: "Viewer",
  email: "questionnaire.b@meetcutes.test",
  gender: "Female",
  age: 29,
  city: "Austin",
  state: "TX",
  latitude: 30.2672,
  longitude: -97.7431,
  user_state: "active",
  userstate: "active",
  terms_accepted: true,
  termsaccepted: true,
  questionaire_values: { q1: 20 },
  questionaire_values_set: true,
  questionairevalues: { q1: 20 },
  questionairevaluesset: true,
  onetime_fees_required: false,
  onetimefeesrequired: false,
  onetime_fees_paid: true,
  onetimefeespaid: true,
  images: [],
  image_urls: [],
};

const respond = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

function applyQuestionnaireUpdate(profile, body) {
  const values = body?.questionairevalues ?? body?.questionaire_values ?? {};

  return {
    ...profile,
    questionaire_values: values,
    questionaire_values_set: true,
    questionairevalues: values,
    questionairevaluesset: true,
  };
}

async function installPageMocks(
  page,
  { selfProfile, getTargetProfile = null, onPatch = null },
) {
  await mockEmptyNotificationInbox(page);

  await page.route("**/api/users/profile", (route) =>
    respond(route, { status: "success", user: selfProfile() }),
  );

  await page.route("**/api/v1/profiles/me**", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      const updated = onPatch
        ? onPatch(body)
        : applyQuestionnaireUpdate(selfProfile(), body);

      return respond(route, { status: "success", data: { profile: updated } });
    }

    return respond(route, {
      status: "success",
      data: { profile: selfProfile() },
    });
  });

  // The production client currently writes profile updates through
  // /api/v1/profiles/me. Keep the legacy alias covered as well so the suite
  // remains valid if the route is switched back.
  await page.route("**/api/v1/user/update**", async (route) => {
    const body = route.request().postDataJSON();
    const updated = onPatch
      ? onPatch(body)
      : applyQuestionnaireUpdate(selfProfile(), body);

    return respond(route, { status: "success", data: { profile: updated } });
  });

  if (getTargetProfile) {
    const targetId = getTargetProfile()?.id;

    await page.route(`**/api/v1/profiles/${targetId}`, (route) =>
      respond(route, {
        status: "success",
        data: { profile: getTargetProfile() },
      }),
    );

    await page.route(`**/api/v1/search/user/${targetId}`, (route) =>
      respond(route, {
        status: "success",
        data: { user: getTargetProfile() },
      }),
    );
  }

  await page.route("**/api/v1/relationships**", (route) =>
    respond(route, {
      status: "success",
      data: {
        relationships: { likes: [], blocks: [], mutes: [], matches: [] },
      },
    }),
  );

  await page.route("**/api/v1/events**", (route) =>
    respond(route, {
      status: "success",
      data: {
        events: [],
        pagination: { total: 0, limit: 20, offset: 0, has_more: false },
      },
    }),
  );

  await page.route("**/api/v1/locations/autocomplete**", (route) =>
    respond(route, { data: { locations: [] } }),
  );
}

async function seedSession(page, profile, token) {
  await page.goto("/");

  await page.evaluate(
    async ({ sessionProfile, sessionToken }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");

      useAuthStore.getState().setSession({
        token: sessionToken,
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
    { sessionProfile: profile, sessionToken: token },
  );
}

test.describe("questionnaire lifecycle", () => {
  test("saves slider values and exposes qualitative values to another member", async ({
    browser,
  }) => {
    let savedProfileA = { ...USER_A };
    const patchRequests = [];

    const contextA = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1280, height: 900 },
    });
    const pageA = await contextA.newPage();

    try {
      await installPageMocks(pageA, {
        selfProfile: () => savedProfileA,
        onPatch: (body) => {
          patchRequests.push(body);
          savedProfileA = applyQuestionnaireUpdate(savedProfileA, body);
          return savedProfileA;
        },
      });

      await seedSession(pageA, USER_A, "questionnaire-token-a");
      await pageA.goto("/questionaire");

      const q1 = pageA.getByTestId("questionnaire-question-q1");
      await expect(q1).toBeVisible({ timeout: 30_000 });
      await expect(q1.getByText("Android", { exact: true })).toBeVisible();
      await expect(q1.getByText("iPhone", { exact: true })).toBeVisible();

      const slider = q1.locator('[data-slot="slider"]');
      const track = q1.locator('[data-slot="slider-track"]');
      const thumb = q1.locator('[data-slot="slider-thumb"]');

      await expect(slider).toBeVisible();
      const trackBox = await track.boundingBox();
      const thumbBox = await thumb.boundingBox();

      expect(trackBox).not.toBeNull();
      expect(thumbBox).not.toBeNull();

      const startX = thumbBox.x + thumbBox.width / 2;
      const dragY = thumbBox.y + thumbBox.height / 2;
      const targetX = trackBox.x + trackBox.width * 0.85;

      await pageA.mouse.move(startX, dragY);
      await pageA.mouse.down();
      await pageA.mouse.move(targetX, dragY, { steps: 15 });
      await pageA.mouse.up();

      await expect(
        q1.getByText("Strongly lean right", { exact: true }),
      ).toBeVisible();
      await expect(q1.getByText(/^\d+$/)).toHaveCount(0);

      const patchPromise = pageA.waitForRequest(
        (request) =>
          request.method() === "PATCH" &&
          (request.url().includes("/api/v1/profiles/me") ||
            request.url().includes("/api/v1/user/update")),
      );

      await pageA.getByRole("button", { name: "Submit" }).click();

      const patchRequest = await patchPromise;
      const payload = patchRequest.postDataJSON();

      expect(payload.questionairevaluesset).toBe(true);
      expect(payload.questionairevalues?.q1).toBeGreaterThanOrEqual(80);
      expect(payload.questionairevalues?.q1).toBeLessThanOrEqual(100);
      expect(patchRequests).toHaveLength(1);

      await expect(pageA).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    } finally {
      await contextA.close();
    }

    const savedQ1 = savedProfileA.questionairevalues?.q1;
    expect(savedQ1).toBeGreaterThanOrEqual(80);
    expect(savedQ1).toBeLessThanOrEqual(100);

    const contextB = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1280, height: 900 },
    });
    const pageB = await contextB.newPage();

    try {
      await installPageMocks(pageB, {
        selfProfile: () => USER_B,
        getTargetProfile: () => savedProfileA,
      });

      await seedSession(pageB, USER_B, "questionnaire-token-b");
      await pageB.goto(`/user/${USER_A_ID}`);

      await expect(
        pageB.getByRole("heading", { name: /Alex Taker, 30/, level: 1 }),
      ).toBeVisible({ timeout: 30_000 });

      await pageB
        .getByRole("button", { name: /Questionnaire Values/ })
        .click();

      const q1Public = pageB.getByTestId("profile-question-q1");
      await expect(q1Public).toBeVisible();

      await expect(
        q1Public.getByText("Prefers iPhone", { exact: true }),
      ).toBeVisible();

      const pinValue = Number(
        await q1Public
          .getByTestId("profile-question-pin-q1")
          .getAttribute("data-value"),
      );

      expect(pinValue).toBeGreaterThanOrEqual(80);
      expect(pinValue).toBeLessThanOrEqual(100);
      await expect(q1Public.getByText(/^\d+%$/)).toHaveCount(0);
      await expect(q1Public.getByText(/\b\d{1,3}%\b/)).toHaveCount(0);
    } finally {
      await contextB.close();
    }
  });
});
