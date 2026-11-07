import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * Password recovery / credential rotation coverage.
 *
 * These tests mock the native Phoenix endpoints so they verify the React
 * contract exactly: the request path, the success toast, the security
 * countdown, the retry-limit error block, and the dashboard redirect.
 */

const FORGOT_ENDPOINT = "**/api/v1/auth/forgot-password";
const RESET_ENDPOINT = "**/api/v1/auth/reset-password/**";
const RESET_LIMIT_MESSAGE =
  "Password reset limit exceeded. Please contact support.";

test.describe("password recovery", () => {
  test("requests a reset link and starts the 10-second security countdown", async ({
    page,
  }) => {
    let submitted = null;

    await page.route(FORGOT_ENDPOINT, async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          message:
            "If this email is associated with an account, a password reset link has been sent.",
          password_retry_count: 1,
        }),
      });
    });

    await page.goto("/forgot-password");

    await page.getByLabel("Email address").fill(USERS.viewer.email);
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    await expect(
      page
        .getByText("Password reset email sent! Please check your inbox")
        .first(),
    ).toBeVisible();

    expect(submitted?.user?.email).toBe(USERS.viewer.email);

    const countdown = page.getByTestId("password-reset-countdown");
    await expect(countdown).toContainText(
      "Redirecting to login in 10 seconds for security reasons...",
    );
    // The timer must tick down without another network request.
    await expect(countdown).toContainText(
      "Redirecting to login in 9 seconds for security reasons...",
      { timeout: 5_000 },
    );
  });

  test("surfaces the retry-limit error block when the account is locked", async ({
    page,
  }) => {
    await page.route(FORGOT_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: "password_reset_limit_exceeded",
          message: RESET_LIMIT_MESSAGE,
          password_retry_count: 7,
        }),
      });
    });

    await page.goto("/forgot-password");

    await page.getByLabel("Email address").fill(USERS.viewer.email);
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    const errorBlock = page.getByTestId("password-reset-limit-error");
    await expect(errorBlock).toBeVisible();
    await expect(errorBlock).toHaveText(RESET_LIMIT_MESSAGE);
  });

  test("rotates the password through the v1 endpoint and lands on the dashboard", async ({
    page,
  }) => {
    let resetUrl = null;
    let resetBody = null;

    await page.route(RESET_ENDPOINT, async (route) => {
      resetUrl = route.request().url();
      resetBody = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          message: "Password has been reset successfully",
          password_retry_count: 0,
        }),
      });
    });

    // A signed-in session keeps `/dashboard` reachable after the redirect.
    await login(page, USERS.viewer.email);
    await page.goto("/changepassword?token=mock_token");

    await page
      .getByLabel("New Password", { exact: true })
      .fill("NewPassword1");
    await page
      .getByLabel("Confirm New Password", { exact: true })
      .fill("NewPassword1");

    await page.getByRole("button", { name: "Change Password" }).click();

    await expect(page.getByText("Password Changed!")).toBeVisible();

    expect(resetUrl).toContain("/api/v1/auth/reset-password/mock_token");
    expect(resetBody?.user).toMatchObject({
      password: "NewPassword1",
      password_confirmation: "NewPassword1",
    });

    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
