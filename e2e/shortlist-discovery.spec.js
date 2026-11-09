import { test, expect } from "@playwright/test";
import { mockEmptyNotificationInbox } from "./helpers.js";

/**
 * Shortlist / Likes discovery coverage.
 *
 * The backend enforces the 100-mile radius. The UI also applies a defensive
 * radius check so a malformed or stale payload can never leak a far-away card.
 */

const BASE_URL = "http://127.0.0.1:5180";

const PROFILE = {
  id: "e2e-shortlist-viewer",
  nickname: "e2e_shortlist_viewer",
  first_name: "Shortlist",
  last_name: "Viewer",
  email: "e2e.shortlist@meetcutes.test",
  user_state: "active",
  terms_accepted: true,
  latitude: 30.2672,
  longitude: -97.7431,
  city: "Austin",
  state: "Texas",
  questionaire_values_set: false,
  images: [],
  image_urls: [],
  userid: "e2e-shortlist-viewer",
  userhandle: "e2e_shortlist_viewer",
  firstname: "Shortlist",
  lastname: "Viewer",
  userstate: "active",
  termsaccepted: true,
  questionairevaluesset: false,
};

function profileFor({
  id,
  first_name,
  last_name,
  nickname,
  distance_miles,
}) {
  return {
    id,
    nickname,
    first_name,
    last_name,
    city: "Austin",
    state: "Texas",
    avatar_url: null,
    image_urls: [],
    distance_miles,
    user_state: "active",
  };
}

const NEAR_USER = profileFor({
  id: "near-user-id",
  first_name: "Nearby",
  last_name: "Nia",
  nickname: "nearby_nia",
  distance_miles: 15,
});

const FAR_USER = profileFor({
  id: "far-user-id",
  first_name: "Faraway",
  last_name: "Finn",
  nickname: "faraway_finn",
  distance_miles: 120,
});

const ADMIRER = profileFor({
  id: "admiring-user-id",
  first_name: "Admiring",
  last_name: "Ava",
  nickname: "admiring_ava",
  distance_miles: 12,
});

async function seedSession(page, path) {
  await mockEmptyNotificationInbox(page);
  await page.goto("/");

  await page.evaluate(
    async ({ profile }) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setSession({
        token: "e2e-shortlist-token",
        user: {
          id: profile.id,
          email: profile.email,
          user_metadata: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            nickname: profile.nickname,
          },
        },
        profiledata: profile,
      });
    },
    { profile: PROFILE },
  );

  await page.goto(path);
  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setProfiledata(profile);
  }, PROFILE);
}

async function mockShortlistApi(
  page,
  { likedUsers = [], receivedUsers = [] } = {},
) {
  let liked = [...likedUsers];
  let received = [...receivedUsers];
  const ledger = {
    likedRequests: 0,
    receivedRequests: 0,
    deletes: [],
    creates: [],
  };

  const respond = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  const paginate = (users, kind, route) => {
    const url = new URL(route.request().url());
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const perPage = Math.max(
      1,
      Math.min(20, Number(url.searchParams.get("per_page")) || 20),
    );
    const total = users.length;
    const totalPages = Math.ceil(total / perPage);
    const pageUsers = users.slice((page - 1) * perPage, page * perPage);

    return respond(route, {
      data: {
        kind,
        users: pageUsers,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
          has_next_page: page < totalPages,
        },
      },
    });
  };

  await page.route("**/api/users/profile", async (route) => {
    await respond(route, { status: "success", user: PROFILE });
  });

  await page.route("**/api/v1/profiles/me**", async (route) => {
    await respond(route, { status: "success", data: { profile: PROFILE } });
  });

  await page.route(
    /\/api\/v1\/profiles\/(?!me(?:\/|$))[^/]+$/,
    async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const targetId = pathname.split("/").pop();
      const candidate = [...liked, ...received].find(
        (user) => String(user.userid || user.id) === String(targetId),
      );

      if (!candidate) {
        return respond(
          route,
          { status: "error", message: "Profile not found" },
          404,
        );
      }

      return respond(route, {
        status: "success",
        data: { profile: candidate },
      });
    },
  );

  await page.route("**/api/v1/events**", async (route) => {
    await respond(route, { data: { events: [] } });
  });

  await page.route("**/api/v1/locations/autocomplete**", async (route) => {
    await respond(route, { data: { locations: [] } });
  });

  await page.route("**/api/v1/relationships**", async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;
    const matches = liked
      .filter((user) =>
        received.some((fan) => String(fan.id) === String(user.id)),
      )
      .map((user) => user.id);
    const summary = {
      likes: liked.map((user) => user.id),
      blocks: [],
      mutes: [],
      matches,
    };

    if (method === "GET" && pathname.endsWith("/liked")) {
      ledger.likedRequests += 1;
      return paginate(liked, "liked", route);
    }

    if (method === "GET" && pathname.endsWith("/liked-by")) {
      ledger.receivedRequests += 1;
      return paginate(received, "liked_by", route);
    }

    if (method === "GET" && pathname.endsWith("/blocked")) {
      return respond(route, { data: { kind: "blocked", users: [] } });
    }

    if (method === "GET" && pathname.endsWith("/muted")) {
      return respond(route, { data: { kind: "muted", users: [] } });
    }

    if (method === "DELETE") {
      const targetId = pathname.split("/").pop();
      ledger.deletes.push(targetId);
      liked = liked.filter((user) => String(user.id) !== String(targetId));
      received = received.filter((user) => String(user.id) !== String(targetId));

      return respond(route, {
        data: {
          relationships: {
            ...summary,
            likes: liked.map((user) => user.id),
          },
        },
      });
    }

    if (method === "POST" && pathname === "/api/v1/relationships") {
      const body = request.postDataJSON() ?? {};
      const targetId = body.target_id;

      if (body.kind === "like") {
        const candidate = received.find(
          (user) => String(user.id) === String(targetId),
        );

        if (candidate && !liked.some((user) => String(user.id) === String(targetId))) {
          liked = [...liked, candidate];
        }
      }

      ledger.creates.push({ kind: body.kind, targetId });

      return respond(
        route,
        {
          data: {
            relationships: {
              ...summary,
              likes: liked.map((user) => user.id),
              matches: liked
                .filter((user) =>
                  received.some((fan) => String(fan.id) === String(user.id)),
                )
                .map((user) => user.id),
            },
          },
        },
        201,
      );
    }

    return respond(route, {
      data: { relationships: summary },
    });
  });

  return ledger;
}

test.describe("shortlist discovery", () => {
  test("only liked users inside the 100-mile radius are rendered", async ({
    page,
  }) => {
    const ledger = await mockShortlistApi(page, {
      likedUsers: [NEAR_USER, FAR_USER],
    });

    await seedSession(page, "/dashboard/shortlist");

    await expect(
      page.getByText("Your connections in motion"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("aside")).toBeVisible();

    await expect(page.getByText("Nearby Nia")).toBeVisible();
    await expect(page.getByText("Faraway Finn")).toHaveCount(0);

    // The 15-mile card also displays its distance.
    await expect(page.getByText("15.0 mi away")).toBeVisible();
    expect(ledger.likedRequests).toBeGreaterThanOrEqual(1);
  });

  test("unliking a shortlist profile removes its card immediately", async ({
    page,
  }) => {
    const ledger = await mockShortlistApi(page, {
      likedUsers: [NEAR_USER],
    });

    await seedSession(page, "/dashboard/shortlist");

    await expect(page.getByText("Nearby Nia")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /Unlike/ }).click();

    await expect(page.getByText("Nearby Nia")).toHaveCount(0);
    await expect(
      page.getByText("Your shortlist is empty", { exact: true }),
    ).toBeVisible();

    expect(ledger.deletes).toContain(NEAR_USER.id);
  });

  test("liking a received like back transitions the card to Match!", async ({
    page,
  }) => {
    const ledger = await mockShortlistApi(page, {
      likedUsers: [],
      receivedUsers: [ADMIRER],
    });

    await seedSession(page, "/dashboard/shortlist");

    await page.getByRole("tab", { name: /Liked You/ }).click();

    await expect(page.getByText("Admiring Ava")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: /Like back/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Like back/ }).click();

    await expect(page.getByText("Match!", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: /Matched with/ }),
    ).toBeDisabled();

    expect(ledger.creates).toContainEqual({
      kind: "like",
      targetId: ADMIRER.id,
    });
  });

  test("profile navigation keeps the sidebar and returns to the Liked You tab", async ({
    page,
  }) => {
    await mockShortlistApi(page, {
      likedUsers: [NEAR_USER],
      receivedUsers: [ADMIRER],
    });

    await seedSession(page, "/dashboard/shortlist");

    await page.getByRole("tab", { name: /Liked You/ }).click();
    await expect(page.getByText("Admiring Ava")).toBeVisible({
      timeout: 20_000,
    });

    const admirerCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Admiring Ava" })
      .first();

    await admirerCard.getByRole("link", { name: "View profile" }).click();

    await expect(page).toHaveURL(/\/user\/admiring-user-id/);
    await expect(page.locator("aside")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Admiring Ava/ }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Back to Shortlist" }).click();

    await expect(page).toHaveURL(/\/dashboard\/shortlist\?tab=liked-you/);
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByText("Admiring Ava")).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Liked You/ }),
    ).toHaveAttribute("data-state", "active");
  });

  test("loads shortlist and liked-you pages in twenty-card chunks", async ({
    page,
  }) => {
    const likedUsers = Array.from({ length: 21 }, (_, index) =>
      profileFor({
        id: `liked-page-${index + 1}`,
        first_name: `Saved${index + 1}`,
        last_name: "Member",
        nickname: `saved_${index + 1}`,
        distance_miles: index + 1,
      }),
    );
    const receivedUsers = Array.from({ length: 21 }, (_, index) =>
      profileFor({
        id: `received-page-${index + 1}`,
        first_name: `Admirer${index + 1}`,
        last_name: "Member",
        nickname: `admirer_${index + 1}`,
        distance_miles: index + 1,
      }),
    );

    const ledger = await mockShortlistApi(page, { likedUsers, receivedUsers });

    await seedSession(page, "/dashboard/shortlist");

    const shortlistGrid = page.getByTestId("shortlist-grid");
    await expect(shortlistGrid).toBeVisible({ timeout: 20_000 });
    await expect(shortlistGrid.locator('[data-slot="card"]')).toHaveCount(20);
    await expect(page.getByText("Saved21", { exact: false })).toHaveCount(0);

    const shortlistMore = page.getByTestId("shortlist-load-more");
    await expect(shortlistMore).toBeVisible();
    await expect(shortlistMore).toContainText("View More Saved Profiles");
    await shortlistMore.click();

    await expect(page.getByText("Saved21", { exact: false })).toBeVisible();
    await expect(shortlistGrid.locator('[data-slot="card"]')).toHaveCount(21);
    await expect(shortlistMore).toHaveCount(0);

    await page.getByRole("tab", { name: /Liked You/ }).click();

    const likedYouGrid = page.getByTestId("liked-you-grid");
    await expect(likedYouGrid).toBeVisible();
    await expect(likedYouGrid.locator('[data-slot="card"]')).toHaveCount(20);
    await expect(page.getByText("Admirer21", { exact: false })).toHaveCount(0);

    const likedYouMore = page.getByTestId("liked-you-load-more");
    await expect(likedYouMore).toBeVisible();
    await expect(likedYouMore).toContainText("Load More Likes");
    await likedYouMore.click();

    await expect(page.getByText("Admirer21", { exact: false })).toBeVisible();
    await expect(likedYouGrid.locator('[data-slot="card"]')).toHaveCount(21);
    await expect(likedYouMore).toHaveCount(0);

    expect(ledger.likedRequests).toBeGreaterThanOrEqual(2);
    expect(ledger.receivedRequests).toBeGreaterThanOrEqual(2);
  });
});
