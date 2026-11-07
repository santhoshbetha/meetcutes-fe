import { test, expect } from "@playwright/test";
import { login, runPeopleSearch, USERS } from "./helpers.js";

/**
 * Live Phoenix Presence verification.
 *
 * Alice has an active people-search result. Bob signs in through a second
 * independent browser context, which opens his global `online_users` channel.
 * Alice's matching card must switch to the pulsing online dot without a search
 * refetch or manual refresh.
 */

const BASE_URL = "http://127.0.0.1:5180";

async function readAuthUserId(page) {
  return page.evaluate(async () => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    return useAuthStore.getState().profiledata?.userid ?? null;
  });
}

async function readPresenceIds(page) {
  return page.evaluate(async () => {
    const { usePresenceStore } = await import("/src/stores/presenceStore.js");
    return usePresenceStore.getState().onlineUserIds;
  });
}

test.describe("presence tracking", () => {
  test("a second authenticated socket lights up the online dot without a refetch", async ({
    browser,
  }) => {
    const aliceContext = await browser.newContext({ baseURL: BASE_URL });
    const bobContext = await browser.newContext({ baseURL: BASE_URL });
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    try {
      await login(alicePage, USERS.viewer.email);
      await runPeopleSearch(alicePage);

      const bobCard = alicePage
        .locator('[data-slot="card"]')
        .filter({ hasText: USERS.feedViewer.firstName })
        .first();

      await expect(bobCard).toBeVisible({ timeout: 30_000 });
      await expect(bobCard.getByTestId("presence-online-dot")).toHaveCount(0);

      // Confirm Alice's global presence channel is joined before Bob connects.
      const aliceId = await readAuthUserId(alicePage);
      expect(aliceId).toBeTruthy();

      await expect
        .poll(
          async () => {
            const ids = await readPresenceIds(alicePage);
            return ids.includes(String(aliceId));
          },
          { timeout: 20_000 },
        )
        .toBe(true);

      // Any search POST after this point would mean the green dot came from a
      // REST refresh rather than the live channel.
      let searchRequests = 0;
      alicePage.on("request", (request) => {
        if (
          request.method() === "POST" &&
          request.url().includes("/api/search/users")
        ) {
          searchRequests += 1;
        }
      });

      await login(bobPage, USERS.feedViewer.email);

      const bobId = await readAuthUserId(bobPage);
      expect(bobId).toBeTruthy();

      await expect(
        bobCard.getByTestId("presence-online-dot"),
      ).toBeVisible({ timeout: 20_000 });

      expect(searchRequests).toBe(0);

      await expect
        .poll(
          async () => {
            const ids = await readPresenceIds(alicePage);
            return ids.includes(String(bobId));
          },
          { timeout: 20_000 },
        )
        .toBe(true);

      // Closing Bob's browser tears down his channel; Presence must remove him
      // from Alice's store without leaving a stale online indicator.
      await bobContext.close();
      await expect(
        bobCard.getByTestId("presence-online-dot"),
      ).toHaveCount(0, { timeout: 20_000 });

      await expect
        .poll(
          async () => {
            const ids = await readPresenceIds(alicePage);
            return ids.includes(String(bobId));
          },
          { timeout: 20_000 },
        )
        .toBe(false);
    } finally {
      await aliceContext.close().catch(() => {});
      await bobContext.close().catch(() => {});
    }
  });
});
