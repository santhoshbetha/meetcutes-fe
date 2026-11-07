import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  API_URL,
  NEW_EMAIL,
  PASSWORD,
  USERS,
  apiLogin,
  authHeaders,
  getProfile,
  login,
} from "./helpers.js";

function readEmailChangeToken() {
  return fs
    .readFileSync(
      path.join(os.tmpdir(), "meetcutes-e2e-email-change-token"),
      "utf8",
    )
    .trim();
}

test.describe("email change", () => {
  test("requests a confirmation link through the API", async ({ request }) => {
    const token = await apiLogin(request, USERS.emailChange.email);

    const response = await request.put(`${API_URL}/api/users/settings`, {
      headers: authHeaders(token),
      data: {
        action: "update_email",
        user: {
          email: NEW_EMAIL,
          current_password: PASSWORD,
        },
      },
    });

    expect(response.status(), await response.text()).toBe(202);
    const body = await response.json();
    expect(body.message).toMatch(/confirm your email change/i);

    // The account keeps the old address until the link is confirmed.
    const profile = await getProfile(request, token);
    expect(profile.email).toBe(USERS.emailChange.email);
  });

  test("requests a confirmation link from the settings dialog", async ({
    page,
  }) => {
    await login(page, USERS.emailChange.email);
    await page.goto("/settings");

    await expect(
      page.getByText(USERS.emailChange.email),
    ).toBeVisible();

    await page.getByRole("button", { name: "Change Email" }).click();
    await expect(
      page.getByRole("heading", { name: "Change Email Address" }),
    ).toBeVisible();

    await page.getByLabel("New Email Address").fill(NEW_EMAIL);
    await page.getByLabel("Current Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Send Confirmation Link" }).click();

    await expect(
      page.getByText("Confirmation link sent to your new email address.").first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("confirms the change and switches the account email", async ({
    page,
    request,
  }) => {
    const token = readEmailChangeToken();

    await page.goto(
      `/auth/confirm?type=email_change&token=${encodeURIComponent(token)}`,
    );

    await expect(
      page.getByText(/Email address updated successfully!/).first(),
    ).toBeVisible({ timeout: 20_000 });

    // The confirmation page is public, so a signed-out visitor is sent to login.
    await page.waitForURL("**/login", { timeout: 10_000 });

    const newToken = await apiLogin(request, NEW_EMAIL);
    const profile = await getProfile(request, newToken);
    expect(profile.email).toBe(NEW_EMAIL);

    // The old address can no longer be used to sign in.
    const oldLogin = await request.post(`${API_URL}/api/users/login`, {
      data: {
        action: "password",
        user: { email: USERS.emailChange.email, password: PASSWORD },
      },
    });
    expect(oldLogin.ok()).toBeFalsy();
  });
});
