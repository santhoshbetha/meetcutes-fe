import { test, expect } from "@playwright/test";
import { apiLogin, getProfile, login, USERS } from "./helpers.js";

// A real 1x1 PNG. The upload pipeline validates magic bytes, not dimensions.
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

test.describe("profile photos", () => {
  test("uploads a photo into a slot and deletes it again", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const before = await getProfile(request, token);
    expect(before.images ?? []).toEqual([]);

    await login(page, USERS.viewer.email);
    await page.goto("/dashboard?tab=photos");

    await expect(
      page.getByRole("heading", { name: "Your Profile Photos" }),
    ).toBeVisible();

    // The first empty slot renders a minimal uploader with a hidden file input.
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "e2e-photo.png",
      mimeType: "image/png",
      buffer: PNG_BUFFER,
    });

    await expect(page.getByText("Crop Image")).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByText("Photo uploaded").first()).toBeVisible({
      timeout: 60_000,
    });

    const afterUpload = await getProfile(request, token);
    expect(afterUpload.images).toHaveLength(1);
    expect(afterUpload.images[0]).toMatch(/^image_.*\.jpg$/);
    expect(afterUpload.image_urls[0]).toMatch(/^https?:\/\//);
    expect(afterUpload.image_urls[0]).toContain("/uploads/users/");

    // The stored URL is rendered back into the grid.
    await expect(page.getByAltText("Photo 1")).toBeVisible();

    const photoCard = page
      .getByAltText("Photo 1")
      .locator('xpath=ancestor::div[contains(@class,"aspect-square")]');

    await page.getByAltText("Photo 1").hover();
    await photoCard.getByRole("button").click();

    await expect(page.getByText("Photo removed").first()).toBeVisible({
      timeout: 60_000,
    });

    const afterDelete = await getProfile(request, token);
    expect(afterDelete.images).toEqual([""]);
    expect(afterDelete.image_urls).toEqual([null]);
    await expect(page.getByAltText("Photo 1")).toHaveCount(0);
  });
});
