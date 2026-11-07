import { expect } from "@playwright/test";

export const PASSWORD = "E2ePassword123!";
export const API_URL = process.env.E2E_API_URL || "http://127.0.0.1:4100";

export const USERS = {
  viewer: {
    email: "e2e.viewer@meetcutes.test",
    handle: "e2e_viewer",
    firstName: "E2EViewer",
  },
  feedViewer: {
    email: "e2e.feedviewer@meetcutes.test",
    handle: "e2e_feedviewer",
    firstName: "E2EFeedViewer",
  },
  muteTarget: {
    email: "e2e.mute.target@meetcutes.test",
    handle: "e2e_mute_target",
    firstName: "MuteTarget",
  },
  blockTarget: {
    email: "e2e.block.target@meetcutes.test",
    handle: "e2e_block_target",
    firstName: "BlockTarget",
  },
  deactivate: {
    email: "e2e.deactivate@meetcutes.test",
    handle: "e2e_deactivate",
    firstName: "DeactivateUser",
  },
  emailChange: {
    email: "e2e.emailchange@meetcutes.test",
    handle: "e2e_emailchange",
    firstName: "EmailChange",
  },
  paywall: {
    email: "e2e.paywall@meetcutes.test",
    handle: "e2e_paywall",
    firstName: "Paywall",
  },
};

export const NEW_EMAIL = "e2e.emailchange.new@meetcutes.test";

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Serves an empty notification inbox for mocked-session specs.
 *
 * `NavAfter` now asks for the unread count on every authenticated page. Specs
 * that seed a synthetic bearer token must intercept that request so the real
 * backend never rejects it with a 401.
 */
export async function mockEmptyNotificationInbox(page) {
  await page.route("**/api/v1/notifications**", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { updated: 0, unread_count: 0 },
        }),
      });
    }

    if (method === "PATCH") {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: "notification_not_found",
          message: "Notification not found",
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          notifications: [],
          pagination: {
            page: 1,
            per_page: 20,
            total: 0,
            total_pages: 0,
          },
          unread_count: 0,
        },
      }),
    });
  });
}

/**
 * Logs in through the real UI and waits until the dashboard profile renders.
 */
export async function login(page, email, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Obtains a bearer token straight from the API for assertions that should not
 * depend on the UI session.
 */
export async function apiLogin(request, email, password = PASSWORD) {
  const response = await request.post(`${API_URL}/api/users/login`, {
    data: {
      action: "password",
      user: { email, password },
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return body.token;
}

export async function getProfile(request, token) {
  const response = await request.get(`${API_URL}/api/v1/profiles/me`, {
    headers: authHeaders(token),
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.data.profile;
}

export async function getRelationships(request, token) {
  const response = await request.get(`${API_URL}/api/v1/relationships`, {
    headers: authHeaders(token),
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.data.relationships;
}

/**
 * Resolves a user id from a handle using the identifier-search endpoint. The
 * seeded targets opt into handle search.
 */
export async function userIdByHandle(request, token, handle) {
  const response = await request.get(
    `${API_URL}/api/search/user/${encodeURIComponent(handle)}`,
    { headers: authHeaders(token) },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.data.user.id;
}

/**
 * Runs the dashboard people search for the signed-in viewer.
 */
export async function runPeopleSearch(page) {
  await page.goto("/dashboard?tab=users");
  await expect(
    page.getByRole("heading", { name: "Find Connections" }),
  ).toBeVisible();

  await page.getByRole("combobox").click();
  await page
    .getByRole("option", { name: "5 Miles", exact: true })
    .click();
  await page.getByRole("button", { name: "Find Matches" }).click();

  await expect(page.getByText("Search Results")).toBeVisible({
    timeout: 30_000,
  });
}
