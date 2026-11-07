import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";

function readResetToken() {
  return fs
    .readFileSync(path.join(os.tmpdir(), "meetcutes-e2e-reset-token"), "utf8")
    .trim();
}

test.describe("/auth/confirm", () => {
  test("validates a real recovery token and forwards it to the password form", async ({
    page,
  }) => {
    const token = readResetToken();

    await page.goto(
      `/auth/confirm?type=recovery&token=${encodeURIComponent(token)}`,
    );

    // The success card and the toast both contain this copy.
    await expect(
      page.getByText(/Password reset confirmed!/).first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.waitForURL(/\/changepassword\?token=/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Change Password" }),
    ).toBeVisible();
  });

  test("reports an invalid recovery token", async ({ page }) => {
    await page.goto("/auth/confirm?type=recovery&token_hash=not-a-real-token");

    await expect(
      page.getByText("Authentication Failed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("The reset password token is invalid or has expired.", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("explains that unsupported confirmation types are rejected", async ({
    page,
  }) => {
    await page.goto("/auth/confirm?type=invite&token_hash=not-a-real-token");

    await expect(
      page.getByText("Authentication Failed", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/no longer supported/i)).toBeVisible();
  });

  test("rejects a link with missing parameters", async ({ page }) => {
    await page.goto("/auth/confirm");

    await expect(
      page.getByText("Authentication Failed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/invalid or missing authentication parameters/i),
    ).toBeVisible();
  });
});
