import { test, expect } from "@playwright/test";
import { apiLogin, API_URL, authHeaders, login, USERS } from "./helpers.js";

/**
 * Notification inbox coverage.
 *
 * The e2e seed resets a deterministic inbox for the viewer and feed viewer
 * before the suite runs: one upcoming event, one profile like, and one admin
 * broadcast per account.
 */

async function mockPhoenixSocket(page) {
  const state = { joins: [], latest: null };

  await page.routeWebSocket("**/socket**", (ws) => {
    ws.onMessage((raw) => {
      let frame;
      try {
        frame = JSON.parse(typeof raw === "string" ? raw : raw.toString());
      } catch {
        return;
      }

      const [joinRef, ref, topic, event] = frame;
      if (!topic || !event) return;

      if (event === "phx_join") {
        state.joins.push({ topic, joinRef, ref });
        state.latest = { ws, topic, joinRef };
        ws.send(
          JSON.stringify([
            joinRef,
            ref,
            topic,
            "phx_reply",
            { status: "ok", response: {} },
          ]),
        );
        return;
      }

      if (event === "heartbeat") {
        ws.send(
          JSON.stringify([
            null,
            ref,
            "phoenix",
            "phx_reply",
            { status: "ok", response: {} },
          ]),
        );
        return;
      }

      if (event === "phx_leave") {
        ws.send(
          JSON.stringify([
            joinRef,
            ref,
            topic,
            "phx_reply",
            { status: "ok", response: {} },
          ]),
        );
      }
    });
  });

  return {
    state,
    async waitForJoinCount(topic, minimum) {
      await expect
        .poll(
          () => state.joins.filter((join) => join.topic === topic).length,
          { timeout: 20_000 },
        )
        .toBeGreaterThanOrEqual(minimum);

      await page.waitForTimeout(300);

      const join = [...state.joins]
        .reverse()
        .find((candidate) => candidate.topic === topic);

      return { ...join, socket: state.latest?.ws };
    },
    push(topic, event, payload, joinRef = null) {
      const target = state.latest;
      if (!target?.ws) throw new Error("No active Phoenix socket");

      target.ws.send(
        JSON.stringify([joinRef ?? target.joinRef, null, topic, event, payload]),
      );
    },
  };
}

test.describe("notification inbox", () => {
  test("prepends a live push into the cache and bumps the global badge", async ({
    page,
  }) => {
    const phoenix = await mockPhoenixSocket(page);

    await login(page, USERS.viewer.email);
    await expect(
      page.getByRole("heading", { name: "Your Profile" }),
    ).toBeVisible({ timeout: 30_000 });

    const userId = await page.evaluate(async () => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      return useAuthStore.getState().profiledata?.userid;
    });

    const topic = `user_notifications:${userId}`;
    const before = phoenix.state.joins.filter(
      (join) => join.topic === topic,
    ).length;

    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // Wait for the persisted inbox before patching the live item into cache.
    await expect(page.getByText("Welcome to your new inbox")).toBeVisible();

    const joined = await phoenix.waitForJoinCount(topic, before + 1);
    const bellBadge = page.locator('header a[href="/notifications"] span');

    await expect(bellBadge).toHaveText("3", { timeout: 20_000 });

    phoenix.push(
      topic,
      "new_notification",
      {
        id: `live-${Date.now()}`,
        type: "upcoming_event",
        title: "Live rooftop mixer",
        body: "Pushed over the personal notification channel.",
        is_read: false,
        metadata: { event_id: "live-event-1" },
        inserted_at: new Date().toISOString(),
      },
      joined.joinRef,
    );

    await expect(page.getByText("Live rooftop mixer")).toBeVisible({
      timeout: 15_000,
    });
    await expect(bellBadge).toHaveText("4", { timeout: 15_000 });
  });

  test("renders every notification type and bulk-marks the viewer inbox read", async ({
    page,
    request,
  }) => {
    await login(page, USERS.viewer.email);

    const bellBadge = page.locator('header a[href="/notifications"] span');
    await expect(bellBadge).toHaveText("3", { timeout: 30_000 });

    await page.goto("/notifications");

    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // Polymorphic cards, one presentation per supported type.
    await expect(
      page.getByText("Coffee & Conversation is near you"),
    ).toBeVisible();
    await expect(page.getByText("Someone liked your profile")).toBeVisible();
    await expect(page.getByText("Welcome to your new inbox")).toBeVisible();

    await expect(page.getByText("Upcoming event", { exact: true })).toBeVisible();
    await expect(page.getByText("New like", { exact: true })).toBeVisible();
    await expect(page.getByText("Announcement", { exact: true })).toBeVisible();

    // Type-specific deep links.
    await expect(
      page.getByRole("link", { name: /View event/i }).first(),
    ).toHaveAttribute("href", "/event/e2e-notification-event");
    await expect(
      page.getByRole("link", { name: /See who liked you/i }).first(),
    ).toHaveAttribute("href", "/dashboard/shortlist?tab=liked-you");

    // Three unread indicator dots are announced to assistive technology.
    await expect(page.getByText("Unread notification")).toHaveCount(3);

    // Local filter ribbon: each tab narrows the feed without a network round trip.
    await page.getByRole("tab", { name: /Likes/ }).click();
    await expect(page.getByText("Someone liked your profile")).toBeVisible();
    await expect(
      page.getByText("Coffee & Conversation is near you"),
    ).toHaveCount(0);
    await expect(page.getByText("Welcome to your new inbox")).toHaveCount(0);

    await page.getByRole("tab", { name: /Events/ }).click();
    await expect(
      page.getByText("Coffee & Conversation is near you"),
    ).toBeVisible();
    await expect(page.getByText("Someone liked your profile")).toHaveCount(0);

    await page.getByRole("tab", { name: /System/ }).click();
    await expect(page.getByText("Welcome to your new inbox")).toBeVisible();
    await expect(
      page.getByText("Coffee & Conversation is near you"),
    ).toHaveCount(0);

    await page.getByRole("tab", { name: /All/ }).click();
    await expect(
      page.getByText("Coffee & Conversation is near you"),
    ).toBeVisible();
    await expect(page.getByText("Someone liked your profile")).toBeVisible();
    await expect(page.getByText("Welcome to your new inbox")).toBeVisible();

    const markAll = page.getByRole("button", { name: "Mark all as read" });
    await expect(markAll).toBeEnabled();
    await markAll.click();

    await expect(
      page.getByText(/3 notifications marked as read\./).first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(markAll).toBeDisabled();
    await expect(page.getByText("Unread notification")).toHaveCount(0);
    await expect(
      page.locator('header a[href="/notifications"] span'),
    ).toHaveCount(0);

    // The persisted backend state agrees with the optimistic UI.
    const token = await apiLogin(request, USERS.viewer.email);
    const response = await request.get(`${API_URL}/api/v1/notifications`, {
      headers: authHeaders(token),
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json();

    expect(body.data.unread_count).toBe(0);
    expect(body.data.notifications).toHaveLength(3);
    expect(
      body.data.notifications.every((notification) => notification.is_read),
    ).toBe(true);
  });

  test("paginates, marks one notification read, and isolates inboxes", async ({
    request,
  }) => {
    const token = await apiLogin(request, USERS.feedViewer.email);

    const firstPage = await request.get(
      `${API_URL}/api/v1/notifications?page=1&per_page=2`,
      { headers: authHeaders(token) },
    );

    expect(firstPage.ok(), await firstPage.text()).toBeTruthy();
    const pageBody = await firstPage.json();

    expect(pageBody.data.notifications).toHaveLength(2);
    expect(pageBody.data.pagination.per_page).toBe(2);
    expect(pageBody.data.pagination.total).toBe(3);
    expect(pageBody.data.pagination.total_pages).toBe(2);
    expect(pageBody.data.unread_count).toBe(3);

    const target = pageBody.data.notifications.find(
      (notification) => !notification.is_read,
    );
    expect(target).toBeTruthy();

    const read = await request.patch(
      `${API_URL}/api/v1/notifications/${target.id}/read`,
      { headers: authHeaders(token) },
    );

    expect(read.ok(), await read.text()).toBeTruthy();
    const readBody = await read.json();

    expect(readBody.data.notification.is_read).toBe(true);
    expect(readBody.data.unread_count).toBe(2);

    // A different account cannot touch this notification.
    const viewerToken = await apiLogin(request, USERS.viewer.email);
    const crossUser = await request.patch(
      `${API_URL}/api/v1/notifications/${target.id}/read`,
      { headers: authHeaders(viewerToken) },
    );

    expect(crossUser.status()).toBe(404);

    const bulk = await request.post(
      `${API_URL}/api/v1/notifications/mark-all-read`,
      { headers: authHeaders(token) },
    );

    expect(bulk.ok(), await bulk.text()).toBeTruthy();
    expect((await bulk.json()).data).toMatchObject({
      updated: 2,
      unread_count: 0,
    });
  });
});
