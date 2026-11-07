import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * Photos E2E coverage.
 *
 * The production media layer talks to the Elixir API:
 *   - POST   /api/v1/profiles/me/images      (multipart upload, `slot` + `file`)
 *   - DELETE /api/v1/profiles/me/images/:slot
 *   - PUT    /api/v1/profiles/me/images      (reorder / compact slots)
 *   - PATCH  /api/v1/profiles/me             (profile sync)
 *
 * Every one of those is intercepted below so the suite never touches R2/S3.
 * The handlers keep a mutable profile in the test process and echo it back,
 * which is exactly what `useUploadProfileImageMutation` / `deleteImage` /
 * `reorderImages` consume through `unwrapProfile`.
 */

// 1x1 JPEG. Small enough to be fast, valid enough for the cropper + canvas.
const MOCK_AVATAR_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

const MAX_SLOTS = 10;
const UPLOAD_DELAY_MS = 800;
const DELETE_DELAY_MS = 800;
const REORDER_DELAY_MS = 700;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createProfileState() {
  return {
    id: "e2e-photo-user",
    nickname: "e2e_photographer",
    first_name: "E2E",
    last_name: "Photographer",
    email: USERS.viewer.email,
    user_state: "active",
    terms_accepted: true,
    latitude: 30.2672,
    longitude: -97.7431,
    images: [],
    image_urls: [],
  };
}

/**
 * Normalizes the sparse slot arrays the backend expects. `images` holds
 * storage filenames and `image_urls` holds the matching public URLs.
 */
function ensureSlotArrays(profile) {
  profile.images = Array.from(
    { length: MAX_SLOTS },
    (_, index) => profile.images?.[index] || "",
  );
  profile.image_urls = Array.from(
    { length: MAX_SLOTS },
    (_, index) => profile.image_urls?.[index] ?? null,
  );
}

function setSlot(profile, slot, filename, url) {
  ensureSlotArrays(profile);
  profile.images[slot] = filename;
  profile.image_urls[slot] = url;
}

function profilePayload(profile) {
  return { status: "success", data: { profile } };
}

/**
 * Installs every media/profile route for one test. `calls` is the assertion
 * ledger; `delays` lets a test hold a response open long enough to observe the
 * `uploadingSlots` / `removingSlots` overlays.
 */
async function mockMediaApi(page, profileState, calls, delays = {}) {
  const uploadDelay = delays.upload ?? 0;
  const deleteDelay = delays.delete ?? 0;
  const reorderDelay = delays.reorder ?? 0;

  // Profile hydration used by AuthProvider. Returning our mutable profile keeps
  // a background refetch from restoring real database photos.
  await page.route("**/api/users/profile", async (route) => {
    calls.getProfile += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: profileState }),
    });
  });

  // GET / PATCH profile sync. PATCH is mocked even though Photos does not call
  // it directly, so no real profile write can leak out of this suite.
  await page.route("**/api/v1/profiles/me", async (route) => {
    const method = route.request().method();

    if (method === "PATCH") {
      calls.patch += 1;
      try {
        const body = route.request().postDataJSON();
        if (body && typeof body === "object") {
          Object.assign(profileState, body);
          ensureSlotArrays(profileState);
        }
      } catch {
        // A non-JSON PATCH body is still acknowledged as a success footprint.
      }
    } else if (method === "GET") {
      calls.getProfile += 1;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profilePayload(profileState)),
    });
  });

  // Upload / delete / reorder all live under the same path.
  await page.route("**/api/v1/profiles/me/images**", async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "POST") {
      calls.upload += 1;
      const body = request.postDataBuffer()?.toString("utf8") ?? "";
      const slotMatch = body.match(/name="slot"\r\n\r\n(\d+)/);
      const slot = Number(slotMatch?.[1] ?? 0);
      const filename = `image_e2e_${slot}_${Date.now()}.jpg`;
      const url = `https://cdn.meetcutes.test/uploads/users/${filename}`;

      await wait(uploadDelay);
      setSlot(profileState, slot, filename, url);
    } else if (method === "DELETE") {
      calls.delete += 1;
      const pathname = new URL(request.url()).pathname;
      const slot = Number(pathname.split("/").pop());

      await wait(deleteDelay);
      setSlot(profileState, slot, "", null);
    } else if (method === "PUT") {
      calls.reorder += 1;
      const payload = request.postDataJSON() ?? {};
      const reordered = Array.from(
        { length: MAX_SLOTS },
        (_, index) => payload.images?.[index] || "",
      );

      // Keep URLs aligned with filenames while the array is compacted.
      const urlByFilename = new Map();
      ensureSlotArrays(profileState);
      profileState.images.forEach((filename, index) => {
        if (filename) urlByFilename.set(filename, profileState.image_urls[index]);
      });

      await wait(reorderDelay);
      profileState.images = reordered;
      profileState.image_urls = reordered.map((filename) =>
        filename ? urlByFilename.get(filename) ?? null : null,
      );
      calls.lastReorder = reordered;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profilePayload(profileState)),
    });
  });
}

/**
 * Logs in through the real UI (so the bearer token is valid for the app shell),
 * then replaces `profiledata` with a deterministic media fixture.
 */
async function loginWithProfile(page, profileState, overrides = {}) {
  await login(page, USERS.viewer.email);

  const currentProfile = await page.evaluate(async () => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    return useAuthStore.getState().profiledata;
  });

  Object.assign(profileState, currentProfile ?? {});
  profileState.images = [];
  profileState.image_urls = [];
  ensureSlotArrays(profileState);

  Object.assign(profileState, overrides);
  ensureSlotArrays(profileState);

  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(profile);
  }, profileState);
}

function photoSlots(page) {
  return page.locator("div.grid > div.group");
}

test.describe("profile photo lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Start every test at the documented three default slots regardless of any
    // value left in localStorage by an earlier run.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("visibleSlots", "3");
      } catch {
        // localStorage is unavailable on about:blank; the app page will set it.
      }
    });
  });

  test("adds a slot and removes the empty slot again", async ({ page }) => {
    const profileState = createProfileState();
    const calls = { upload: 0, delete: 0, reorder: 0, patch: 0, getProfile: 0 };

    await mockMediaApi(page, profileState, calls, {
      reorder: REORDER_DELAY_MS,
    });
    await loginWithProfile(page, profileState);

    await page.goto("/photos");
    await expect(
      page.getByRole("heading", { name: "Your Profile Photos" }),
    ).toBeVisible();

    // Three default, unpopulated slots.
    await expect(photoSlots(page)).toHaveCount(3);
    await expect(page.locator('input[type="file"]')).toHaveCount(3);
    await expect(page.locator('img[alt^="Photo "]')).toHaveCount(0);

    await page.getByRole("button", { name: /Add New Photo Slot/ }).click();

    await expect(photoSlots(page)).toHaveCount(4);
    await expect(page.locator('input[type="file"]')).toHaveCount(4);

    // Only the extra empty slot exposes the compact/remove control.
    const removeEmptySlot = page.locator("button:has(svg.h-3.w-3)");
    await expect(removeEmptySlot).toHaveCount(1);
    await removeEmptySlot.click();

    // handleRemoveEmptySlot puts this slot into its removing state.
    await expect(page.locator("svg.animate-spin.text-red-500")).toBeVisible();

    await expect(photoSlots(page)).toHaveCount(3);
    await expect(page.locator('input[type="file"]')).toHaveCount(3);

    // The reorder call receives a full, compacted 10-slot payload.
    expect(calls.reorder).toBe(1);
    expect(calls.lastReorder).toHaveLength(MAX_SLOTS);
    expect(calls.lastReorder.every((filename) => filename === "")).toBe(true);
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("visibleSlots")))
      .toBe("3");
  });

  test("uploads a cropped photo into slot 1 and updates its badge", async ({
    page,
  }) => {
    const profileState = createProfileState();
    const calls = { upload: 0, delete: 0, reorder: 0, patch: 0, getProfile: 0 };

    await mockMediaApi(page, profileState, calls, { upload: UPLOAD_DELAY_MS });
    await loginWithProfile(page, profileState);

    await page.goto("/photos");
    await expect(photoSlots(page)).toHaveCount(3);

    const badgeOne = page
      .locator('span[data-slot="badge"]')
      .filter({ hasText: /^1$/ });

    await expect(badgeOne).toHaveClass(/bg-gray-400/);

    // Slot 1 is the first hidden <input type="file"> inside <ImageUploader />.
    const firstSlotInput = page.locator('input[type="file"]').nth(0);
    await firstSlotInput.setInputFiles({
      name: "_mock_avatar.jpg",
      mimeType: "image/jpeg",
      buffer: MOCK_AVATAR_JPEG,
    });

    await expect(page.getByText("Crop Image")).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();

    // uploadingSlots[0] overlay while the mocked POST is held open.
    await expect(
      page.locator("svg.animate-spin.text-blue-500"),
    ).toBeVisible();
    expect(calls.upload).toBe(1);

    // The mutation response carries the new filename/url, so the grid swaps the
    // uploader placeholder for the rendered image.
    await expect(page.getByAltText("Photo 1")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("svg.animate-spin.text-blue-500")).toHaveCount(0);

    // Badge uses the populated/success variant (default + green accent).
    await expect(badgeOne).toHaveClass(/bg-green-500/);
    await expect(page.locator('input[type="file"]')).toHaveCount(2);

    expect(profileState.images[0]).toMatch(/^image_e2e_0_/);
    expect(profileState.image_urls[0]).toContain("/uploads/users/");
    expect(profileState.image_urls[0]).toContain(profileState.images[0]);
  });

  test("removes a populated photo and restores the uploader placeholder", async ({
    page,
  }) => {
    const profileState = createProfileState();
    const seededFilename = "image_seed_existing.jpg";
    const seededUrl = `https://cdn.meetcutes.test/uploads/users/${seededFilename}`;
    const calls = { upload: 0, delete: 0, reorder: 0, patch: 0, getProfile: 0 };

    await mockMediaApi(page, profileState, calls, { delete: DELETE_DELAY_MS });
    await loginWithProfile(page, profileState, {
      images: [seededFilename],
      image_urls: [seededUrl],
    });

    await page.goto("/photos");
    await expect(photoSlots(page)).toHaveCount(3);

    const photo = page.getByAltText("Photo 1");
    await expect(photo).toBeVisible();

    const badgeOne = page
      .locator('span[data-slot="badge"]')
      .filter({ hasText: /^1$/ });
    await expect(badgeOne).toHaveClass(/bg-green-500/);

    const photoCard = photo.locator(
      'xpath=ancestor::div[contains(@class,"aspect-square")]',
    );
    const deleteButton = photoCard.getByRole("button");
    await expect(deleteButton.locator("svg.h-4.w-4")).toBeVisible();

    // The destructive control is revealed by the group hover.
    await photo.hover();
    await expect(deleteButton).toHaveCSS("opacity", "1");
    await deleteButton.click();

    // removingSlots[0] overlay while the mocked DELETE is held open.
    await expect(page.locator("svg.animate-spin.text-white")).toBeVisible();
    expect(calls.delete).toBe(1);

    // The slot is wiped back to an empty <ImageUploader /> placeholder.
    await expect(page.getByAltText("Photo 1")).toHaveCount(0);
    await expect(badgeOne).toHaveClass(/bg-gray-400/);
    await expect(page.locator('input[type="file"]')).toHaveCount(3);
    await expect(page.getByText("Click to upload").first()).toBeVisible();

    expect(profileState.images[0]).toBe("");
    expect(profileState.image_urls[0]).toBeNull();
  });
});
