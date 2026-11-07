import { test, expect } from "@playwright/test";
import {
  apiLogin,
  API_URL,
  authHeaders,
  getRelationships,
  login,
  runPeopleSearch,
  USERS,
  userIdByHandle,
} from "./helpers.js";

test.describe("relationships and feed visibility", () => {
  test("like, mute, and block remove the target from the feed", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.feedViewer.email);
    const muteTargetId = await userIdByHandle(
      request,
      token,
      USERS.muteTarget.handle,
    );
    const blockTargetId = await userIdByHandle(
      request,
      token,
      USERS.blockTarget.handle,
    );

    await login(page, USERS.feedViewer.email);
    await runPeopleSearch(page);

    // Like then mute the first target. Muting supersedes the outgoing like.
    await expect(
      page.locator("h4", { hasText: USERS.muteTarget.firstName }),
    ).toBeVisible();
    await page.locator("h4", { hasText: USERS.muteTarget.firstName }).click();
    await expect(
      page.getByRole("button", { name: "Like", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Like", exact: true }).click();
    await expect(page.getByText(/Liked MuteTarget/).first()).toBeVisible();

    await page.getByRole("button", { name: "Mute" }).click();
    await expect(page.getByText(/Muted MuteTarget/).first()).toBeVisible();
    await page.getByRole("button", { name: "Close profile" }).click();

    await expect(
      page.locator("h4", { hasText: USERS.muteTarget.firstName }),
    ).toHaveCount(0);

    // Blocking requires explicit confirmation and hides the profile entirely.
    await expect(
      page.locator("h4", { hasText: USERS.blockTarget.firstName }),
    ).toBeVisible();
    await page.locator("h4", { hasText: USERS.blockTarget.firstName }).click();

    await page.getByRole("button", { name: "Block", exact: true }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Block", exact: true }).click();

    await expect(page.getByText(/Blocked BlockTarget/).first()).toBeVisible();
    await page.getByRole("button", { name: "Close profile" }).click();

    await expect(
      page.locator("h4", { hasText: USERS.blockTarget.firstName }),
    ).toHaveCount(0);

    const relationships = await getRelationships(request, token);
    expect(relationships.mutes).toContain(muteTargetId);
    expect(relationships.likes).not.toContain(muteTargetId);
    expect(relationships.blocks).toContain(blockTargetId);

    // Blocks are invisible everywhere. Muted profiles remain reachable from
    // the management directory so they can be unmuted directly.
    const mutedResponse = await request.get(
      `${API_URL}/api/v1/profiles/${muteTargetId}`,
      { headers: authHeaders(token) },
    );
    expect(mutedResponse.status()).toBe(200);

    const blockedResponse = await request.get(
      `${API_URL}/api/v1/profiles/${blockTargetId}`,
      { headers: authHeaders(token) },
    );
    expect(blockedResponse.status()).toBe(404);

    await page.goto(`/user/${muteTargetId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: /MuteTarget/ }),
    ).toBeVisible();

    await page.goto(`/user/${blockTargetId}`);
    await expect(
      page.getByRole("heading", { name: "Profile Not Found" }),
    ).toBeVisible();
  });
});
