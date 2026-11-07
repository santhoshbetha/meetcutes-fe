import { test, expect } from "@playwright/test";
import { apiLogin, getProfile, login, USERS } from "./helpers.js";

// A real 1x1 PNG. The upload pipeline validates magic bytes, not dimensions.
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

test.describe("avatar upload", () => {
  test("uploads a cropped avatar to object storage and persists avatar_url", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const before = await getProfile(request, token);
    expect(before.avatar_url).toBeNull();

    await login(page, USERS.viewer.email);

    await page
      .getByRole("button", { name: "Upload custom image attachment" })
      .click();
    await expect(page.getByText("Update Profile Avatar")).toBeVisible();

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "e2e-avatar.png",
        mimeType: "image/png",
        buffer: PNG_BUFFER,
      });

    await expect(page.getByText("Crop Image")).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(
      page.getByText("Profile avatar updated successfully!").first(),
    ).toBeVisible({ timeout: 60_000 });

    const after = await getProfile(request, token);

    expect(after.avatar).toBeTruthy();
    expect(after.avatar.filename).toMatch(/^avatar_.*\.jpg$/);
    // The crop dialog re-encodes the canvas as JPEG before uploading.
    expect(after.avatar.content_type).toBe("image/jpeg");
    expect(after.avatar_url).toMatch(/^https?:\/\//);
    expect(after.avatar_url).toContain("/uploads/users/");
  });
});
