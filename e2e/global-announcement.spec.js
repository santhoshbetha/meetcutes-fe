import { test, expect } from "@playwright/test";

const MESSAGE = "Holiday giveaway: premium discovery is free this week.";

async function mockAnnouncement(page, message) {
  await page.route("**/api/v1/public/global-announcement", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message }),
    }),
  );
}

test.describe("public global announcement", () => {
  test("renders the configured banner on the landing page", async ({ page }) => {
    await mockAnnouncement(page, MESSAGE);
    await page.goto("/");

    await expect(
      page.getByTestId("global-announcement-banner"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(MESSAGE)).toBeVisible();
  });

  test("renders no banner or empty wrapper when the message is null", async ({
    page,
  }) => {
    await mockAnnouncement(page, null);
    await page.goto("/");

    await expect(
      page.getByTestId("global-announcement-banner"),
    ).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(MESSAGE)).toHaveCount(0);
  });

  test("renders no banner when the message is empty", async ({ page }) => {
    await mockAnnouncement(page, "   ");
    await page.goto("/");

    await expect(
      page.getByTestId("global-announcement-banner"),
    ).toHaveCount(0, { timeout: 20_000 });
  });
});
