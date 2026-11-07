import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * Event discussion stream audit.
 *
 * The frontend joins the Phoenix topic `events:discussion:<event_id>` (with the
 * legacy `comments:<event_id>` topic still supported by the backend) and
 * appends `new_comment` pushes directly into the TanStack cache. This suite
 * runs Alice and Bob in separate browser contexts and proves that:
 *
 *   1. Alice's POST reaches the comment endpoint.
 *   2. Bob receives the server push over his own Phoenix socket.
 *   3. Bob does not reload or issue a second comments GET.
 *   4. Script-bearing comment bodies render as escaped text, not markup.
 */

const EVENT_ID = "123";
const DISCUSSION_TOPIC = `events:discussion:${EVENT_ID}`;
const BASE_URL = "http://127.0.0.1:5180";

const ALICE = {
  id: "alice-user-id",
  nickname: "alice_tester",
  first_name: "Alice",
  last_name: "Tester",
  email: "alice@e2e.test",
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  images: [],
  image_urls: [],
  userid: "alice-user-id",
  userhandle: "alice_tester",
  firstname: "Alice",
  lastname: "Tester",
  userstate: "active",
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
};

const BOB = {
  ...ALICE,
  id: "bob-user-id",
  nickname: "bob_tester",
  first_name: "Bob",
  last_name: "Tester",
  email: "bob@e2e.test",
  userid: "bob-user-id",
  userhandle: "bob_tester",
  firstname: "Bob",
};

function futureDate(daysFromNow = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const CANONICAL_EVENT = {
  id: EVENT_ID,
  title: "Real-Time Discussion Event",
  content: "A test event for the real-time discussion channel.",
  event_date: futureDate(),
  start_at: `${futureDate()}T18:00:00Z`,
  end_at: `${futureDate()}T20:00:00Z`,
  status: "PUBLISHED",
  created_by: "seed-owner",
  location: {
    id: "loc-channel-123",
    name: "Channel Cafe",
    street: "123 Main St",
    locality: "Austin",
    state: "Texas",
    postal_code: "78701",
    latitude: 30.2672,
    longitude: -97.7431,
  },
  attendees: [],
};

const XSS_COMMENT =
  '<script>window.__xss = true</script><img src=x onerror="window.__xss = true">Hello Bob!';

function makeComment({ id, content, profile }) {
  const now = new Date().toISOString();

  return {
    id,
    content,
    user_id: profile.id,
    event_id: EVENT_ID,
    user: {
      id: profile.id,
      nickname: profile.nickname,
      handle: profile.nickname,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar: null,
      avatar_url: null,
    },
    inserted_at: now,
    updated_at: now,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * REST mock for one signed-in browser context.
 *
 * `commentsDelay` keeps the initial loading skeleton observable; the POST
 * handler simulates the controller's broadcast before returning 201.
 */
async function mockEventApi(
  page,
  profile,
  { commentsDelay = 0, postDelay = 0, onCommentCreated } = {},
) {
  const calls = {
    eventGet: 0,
    commentsGet: 0,
    commentsPost: 0,
    feed: 0,
    profile: 0,
  };
  const comments = [];

  await page.route("**/api/users/profile", async (route) => {
    calls.profile += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", user: profile }),
    });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { profile },
      }),
    });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { locations: [] } }),
    });
  });

  await page.route("**/api/v1/events**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === `/api/v1/events/${EVENT_ID}`) {
      calls.eventGet += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { event: CANONICAL_EVENT } }),
      });
    }

    calls.feed += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { events: [] } }),
    });
  });

  await page.route(`**/api/events/${EVENT_ID}/comments**`, async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      calls.commentsGet += 1;
      await wait(commentsDelay);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: comments }),
      });
    }

    if (method === "POST") {
      calls.commentsPost += 1;
      const body = route.request().postDataJSON() ?? {};
      const content = body?.comment?.content ?? "";
      const comment = makeComment({
        id: `comment-${calls.commentsPost}`,
        content,
        profile,
      });
      comments.push(comment);

      // The Elixir controller broadcasts before returning 201.
      onCommentCreated?.(comment);

      await wait(postDelay);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: comment }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });

  await page.route("**/api/comments/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });

  return { calls, comments };
}

/**
 * Minimal Phoenix v2 WebSocket server. Replies to joins/heartbeats/leaves and
 * allows the test to broadcast a frame on any joined topic.
 */
async function mockPhoenixSocket(page) {
  const state = {
    sockets: [],
    joins: [],
    leaves: [],
  };

  await page.routeWebSocket("**/socket**", (ws) => {
    state.sockets.push(ws);

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
        state.joins.push({ topic, joinRef, ref, ws });
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
        state.leaves.push({ topic, joinRef, ref });
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
    async waitForJoin(topic) {
      await expect
        .poll(() => state.joins.some((join) => join.topic === topic), {
          timeout: 15_000,
        })
        .toBe(true);

      // Let React StrictMode finish its development-mode remount cycle.
      await page.waitForTimeout(300);
    },
    push(topic, event, payload) {
      const join = [...state.joins]
        .reverse()
        .find((candidate) => candidate.topic === topic);

      if (!join) throw new Error(`No socket joined ${topic}`);

      join.ws.send(
        JSON.stringify([join.joinRef, null, topic, event, payload]),
      );
    },
  };
}

/**
 * Creates one isolated browser context, seeds the Zustand auth session, and
 * opens the shared event page on the discussion tab.
 */
async function createDiscussionUser(browser, profile, token, options = {}) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const rest = await mockEventApi(page, profile, options);
  const phoenix = await mockPhoenixSocket(page);
  await mockEmptyNotificationInbox(page);

  await page.goto("/");
  await page.evaluate(
    async ({ token: sessionToken, user, profile: sessionProfile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: sessionToken,
        user,
        profiledata: sessionProfile,
      });
    },
    {
      token,
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          nickname: profile.nickname,
        },
      },
      profile,
    },
  );

  await page.goto(`/event/${EVENT_ID}`);
  await expect(
    page.getByRole("heading", { name: "Real-Time Discussion Event" }),
  ).toBeVisible({ timeout: 30_000 });

  // The reloaded page restores the token from secure storage; pin the profile
  // again so the composer renders immediately while the profile query settles.
  await page.evaluate(async (sessionProfile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(sessionProfile);
  }, profile);

  await page.getByRole("tab", { name: "Discussion" }).click();

  return { context, page, rest, phoenix };
}

test.describe("event discussion stream", () => {
  test("streams Alice's comment to Bob without a reload or extra REST pull", async ({
    browser,
  }) => {
    // Alice's POST triggers the same broadcast the Elixir controller emits.
    let broadcastComment = () => {};

    const alice = await createDiscussionUser(
      browser,
      ALICE,
      "alice-e2e-token",
      {
        postDelay: 500,
        onCommentCreated: (comment) => broadcastComment(comment),
      },
    );

    const bob = await createDiscussionUser(browser, BOB, "bob-e2e-token", {
      commentsDelay: 700,
    });

    try {
      // ── Initial loading and empty states ─────────────────────────────────
      await expect(
        bob.page.locator('[aria-label="Loading comments"]'),
      ).toBeVisible();
      await expect(bob.page.getByText("No comments yet")).toBeVisible();

      await expect(
        alice.page.getByLabel("Write a comment"),
      ).toBeVisible();
      await expect(alice.page.getByText("No comments yet")).toBeVisible();

      // Both browsers must have joined the native discussion topic.
      await alice.phoenix.waitForJoin(DISCUSSION_TOPIC);
      await bob.phoenix.waitForJoin(DISCUSSION_TOPIC);

      broadcastComment = (comment) => {
        alice.phoenix.push(DISCUSSION_TOPIC, "new_comment", { comment });
        bob.phoenix.push(DISCUSSION_TOPIC, "new_comment", { comment });
      };

      const bobCommentsBefore = bob.rest.calls.commentsGet;
      expect(bobCommentsBefore).toBe(1);

      // Marker disappears if Bob's page reloads for any reason.
      await bob.page.evaluate(() => {
        window.__discussionNoReloadMarker = true;
      });

      // ── Alice posts a script-bearing comment ─────────────────────────────
      await alice.page.getByLabel("Write a comment").fill(XSS_COMMENT);
      await alice.page.getByTestId("discussion-submit").click();

      // Alice's composer shows its pending state while the POST is held open.
      await expect(alice.page.getByText(/Posting/)).toBeVisible();
      await expect
        .poll(() => alice.rest.calls.commentsPost)
        .toBe(1);

      // ── Bob receives the channel push ────────────────────────────────────
      await expect(
        bob.page.getByText("1 comment", { exact: true }),
      ).toBeVisible({ timeout: 15_000 });

      await expect(
        bob.page.getByTestId("discussion-list").locator("li"),
      ).toHaveCount(1);
      await expect(
        bob.page
          .getByTestId("discussion-list")
          .getByText(XSS_COMMENT, { exact: true }),
      ).toHaveCount(1);
      await expect(
        bob.page
          .getByTestId("discussion-list")
          .getByText(XSS_COMMENT, { exact: true }),
      ).toBeVisible();

      // No page reload and no duplicate REST fetch on Bob's side.
      expect(
        await bob.page.evaluate(
          () => window.__discussionNoReloadMarker === true,
        ),
      ).toBe(true);
      expect(bob.rest.calls.commentsGet).toBe(bobCommentsBefore);

      // Script markup must be rendered as inert text.
      expect(await bob.page.evaluate(() => window.__xss)).toBeUndefined();
      await expect(
        bob.page.locator("script", { hasText: "window.__xss" }),
      ).toHaveCount(0);
      await expect(bob.page.locator('img[src="x"]')).toHaveCount(0);

      // Alice's own view also settles without a refresh.
      await expect(alice.page.getByText(/Posting/)).toHaveCount(0);
      await expect(
        alice.page
          .getByTestId("discussion-list")
          .getByText(XSS_COMMENT, { exact: true }),
      ).toBeVisible();
      await expect(
        alice.page.getByText("1 comment", { exact: true }),
      ).toBeVisible();
    } finally {
      await alice.context.close();
      await bob.context.close();
    }
  });
});
