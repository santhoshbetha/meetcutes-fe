import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

/**
 * Security-focused photo management coverage.
 *
 * These tests deliberately stay on the client side of the validation boundary:
 * the oversized/invalid payloads must be rejected by the UI before any request
 * to the Elixir media API is made. The media route is intercepted and counted
 * so a regression that starts an upload fails the assertion immediately.
 */

const MAX_SLOTS = 10;

const EMPTY_PROFILE = {
  id: "e2e-photo-security",
  nickname: "e2e_photo_security",
  first_name: "E2E",
  last_name: "Security",
  email: USERS.viewer.email,
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  images: Array(MAX_SLOTS).fill(""),
  image_urls: Array(MAX_SLOTS).fill(null),
};

function profilePayload(profile) {
  return { status: "success", data: { profile } };
}

/**
 * Logs in, replaces the session profile with an empty 3-slot fixture, and opens
 * the standalone /photos route. Returns the media-request ledger.
 */
async function openEmptyPhotos(page) {
  const mediaRequests = [];

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("visibleSlots", "3");
    } catch {
      // about:blank has no storage; the app page will set it.
    }
  });

  // Keep background profile hydration from restoring real database photos.
  await page.route("**/api/users/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: EMPTY_PROFILE }),
    });
  });

  await page.route("**/api/v1/profiles/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profilePayload(EMPTY_PROFILE)),
    });
  });

  // Any upload/delete/reorder request lands here. The tests below expect this
  // ledger to remain empty for rejected files.
  await page.route("**/api/v1/profiles/me/images**", async (route) => {
    mediaRequests.push({
      method: route.request().method(),
      url: route.request().url(),
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profilePayload(EMPTY_PROFILE)),
    });
  });

  await login(page, USERS.viewer.email);

  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    const current = useAuthStore.getState().profiledata ?? {};
    useAuthStore.getState().setProfiledata({
      ...current,
      ...profile,
      images: [],
      image_urls: [],
    });
  }, EMPTY_PROFILE);

  await page.goto("/photos");
  await expect(
    page.getByRole("heading", { name: "Your Profile Photos" }),
  ).toBeVisible();
  await expect(page.locator("div.grid > div.group")).toHaveCount(3);

  return { mediaRequests };
}

test.describe("photo management security guardrails", () => {
  test("rejects an oversized 10MB upload before any media request", async ({
    page,
  }) => {
    const { mediaRequests } = await openEmptyPhotos(page);
    const firstSlot = page.locator("div.grid > div.group").first();
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles({
      name: "too-large.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024, 0x41),
    });

    // Toast + inline slot error both surface the size guardrail.
    const toast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /File too large/ })
      .first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Maximum size allowed is 5MB");
    await expect(firstSlot.getByText(/File too large/)).toBeVisible();

    // The cropper/upload loop never starts.
    await expect(page.getByText("Crop Image")).toHaveCount(0);
    await expect(page.locator("svg.animate-spin.text-blue-500")).toHaveCount(0);
    expect(mediaRequests).toHaveLength(0);
  });

  test("rejects a non-image payload and never activates the upload spinner", async ({
    page,
  }) => {
    const { mediaRequests } = await openEmptyPhotos(page);
    const firstSlot = page.locator("div.grid > div.group").first();
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles({
      name: "payload.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "binary"),
    });

    const toast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /Invalid file type/ })
      .first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Only JPEG, PNG, and WebP");
    await expect(firstSlot.getByText(/Invalid file type/)).toBeVisible();

    // Validation happens before FileReader/canvas, so no crop dialog or spinner.
    await expect(page.getByText("Crop Image")).toHaveCount(0);
    await expect(page.locator("svg.animate-spin.text-blue-500")).toHaveCount(0);
    expect(mediaRequests).toHaveLength(0);
  });
});
