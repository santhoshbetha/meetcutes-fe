import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

test.describe("responsive discovery layouts", () => {
  for (const viewport of VIEWPORTS) {
    test(`Shortlist and Location render at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await login(page, USERS.viewer.email);

      await page.goto("/dashboard/shortlist");
      await expect(
        page.getByRole("heading", { name: "Your connections in motion" }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("tab", { name: /My Shortlist/ }),
      ).toBeVisible();
      await expect(
        page.getByText("This page is under construction."),
      ).toHaveCount(0);

      await page.goto("/dashboard/location");
      await expect(
        page.getByRole("heading", { name: "Set GPS Coordinates" }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText("This page is under construction."),
      ).toHaveCount(0);

      if (viewport.width < 640) {
        const map = page.locator("#coordinates-map-new");

        if (await map.count()) {
          const box = await map.boundingBox();
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(250);
        }

        const latitude = page.locator("#manual-latitude");

        if (await latitude.count()) {
          await expect(latitude).toBeVisible();
        }
      }
    });
  }
});
