import { test, expect } from "@playwright/test";
import {
  apiLogin,
  API_URL,
  authHeaders,
  login,
  PASSWORD,
  USERS,
} from "./helpers.js";

test.describe("account deactivation", () => {
  test("deactivation signs the user out and revokes the bearer token", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.deactivate.email);

    await login(page, USERS.deactivate.email);
    await page.goto("/settings");
    await expect(page.getByText("Privacy Settings")).toBeVisible();

    await page.getByRole("button", { name: "Deactivate Account" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm
      .getByRole("button", { name: "Deactivate Account" })
      .click();

    await expect(
      page.getByText("Account deactivated successfully!").first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/$/);

    const profileResponse = await request.get(`${API_URL}/api/v1/profiles/me`, {
      headers: authHeaders(token),
    });
    expect(profileResponse.status()).toBe(401);

    // Signing in again must be rejected by the UI once the deleted state is
    // returned. (The session is revoked immediately by the deactivation.)
    await page.goto("/login");
    await page.getByLabel("Email Address").fill(USERS.deactivate.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Scope to the login form: sonner also renders the same message in a toast.
    await expect(
      page.locator("form").getByText(/This account has been deleted/),
    ).toBeVisible({ timeout: 30_000 });
  });
});
