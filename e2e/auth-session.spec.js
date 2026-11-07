import { test, expect } from "@playwright/test";
import { USERS, login } from "./helpers.js";

/**
 * Returns true while the encrypted bearer token still lives in localStorage.
 *
 * `react-secure-storage` stores values under a prefixed, type-tagged key, so
 * the assertion matches the logical key instead of the exact storage key.
 */
function hasStoredToken(page) {
  return page.evaluate(() =>
    Object.keys(localStorage).some((key) =>
      key.includes("meetcutes.auth.token"),
    ),
  );
}

test.describe("expired bearer session", () => {
  test("flushes the stored session and redirects to /login on a 401", async ({
    page,
  }) => {
    await login(page, USERS.viewer.email);

    await expect.poll(() => hasStoredToken(page)).toBe(true);

    // Force the next profile hydration to fail the way an expired or revoked
    // token does, without touching the in-browser session first.
    await page.route("**/api/v1/profiles/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          message: "unauthorized",
        }),
      }),
    );

    await page.reload();

    await page.waitForURL("**/login", { timeout: 30_000 });
    await expect(page.getByLabel("Email Address")).toBeVisible();

    // The Zustand store must flush the token, not just navigate away.
    await expect.poll(() => hasStoredToken(page), { timeout: 15_000 }).toBe(false);
  });
});
