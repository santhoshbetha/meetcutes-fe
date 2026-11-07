import { test, expect } from "@playwright/test";
import { apiLogin, getProfile, login, USERS } from "./helpers.js";

test.describe("settings", () => {
  test("saving privacy settings persists across a full reload", async ({
    page,
    request,
  }) => {
    await login(page, USERS.viewer.email);

    await page.goto("/settings");
    await expect(page.getByText("Privacy Settings")).toBeVisible();

    const emailSearch = page.getByRole("switch").nth(0);
    await expect(emailSearch).toHaveAttribute("aria-checked", "true");
    await emailSearch.click();
    await expect(emailSearch).toHaveAttribute("aria-checked", "false");

    // Visibility lives in the merged settings map rather than a users column.
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /Online Only/ }).click();

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Settings updated successfully!").first(),
    ).toBeVisible();

    // The same values must survive a hard reload, not just the in-memory store.
    await page.reload();
    await expect(page.getByText("Privacy Settings")).toBeVisible();
    await expect(page.getByRole("switch").nth(0)).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByRole("combobox")).toContainText("Online Only");

    const token = await apiLogin(request, USERS.viewer.email);
    const profile = await getProfile(request, token);

    expect(profile.email_search).toBe(false);
    expect(profile.visibility_preference).toBe("online-only");
    expect(profile.visibility_preferences).toMatchObject({
      email_search: false,
      visibility_preference: "online-only",
    });
  });
});
