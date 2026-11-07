import dayjs from "dayjs";
import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

function eventPayload(date) {
  return {
    status: "success",
    data: {
      events: [
        {
          id: "rate-limit-event",
          title: "Rate Limit Event",
          content: "Rate limiting E2E event.",
          event_date: date,
          start_at: `${date}T18:00:00Z`,
          end_at: `${date}T20:00:00Z`,
          status: "PUBLISHED",
          attendees_count: 0,
          attendees: [],
          created_by: "rate-limit-owner",
          location: {
            id: "rate-limit-venue",
            name: "Rate Limit Venue",
            street: "10 Throttle Rd",
            locality: "Austin",
            state: "TX",
            postal_code: "78701",
            latitude: 30.2672,
            longitude: -97.7431,
          },
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
    },
  };
}

async function runEventSearch(page) {
  await page.goto("/dashboard/events");
  await expect(
    page.getByRole("heading", { name: "Discover Events" }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Tomorrow", exact: true }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "5 Miles", exact: true }).click();
  await page.getByRole("button", { name: "Find Events" }).first().click();
}

test.describe("search security throttling", () => {
  test("the refresh action starts a 30-second lock and blocks duplicate calls", async ({
    page,
  }) => {
    const date = dayjs().add(1, "day").format("YYYY-MM-DD");
    let requestCount = 0;

    await page.route("**/api/v1/events**", async (route) => {
      const url = new URL(route.request().url());

      if (
        url.pathname === "/api/v1/events" &&
        route.request().method() === "GET"
      ) {
        requestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(eventPayload(date)),
        });
        return;
      }

      await route.continue();
    });

    await login(page, USERS.viewer.email);
    await runEventSearch(page);

    await expect(page.getByText("Rate Limit Event")).toBeVisible({
      timeout: 20_000,
    });

    const refreshButton = page.getByRole("button", {
      name: "Refresh Results",
    });
    await expect(refreshButton).toBeEnabled();
    expect(requestCount).toBe(1);

    await refreshButton.click();

    const lockedButton = page.getByRole("button", {
      name: /Refresh \(\d+s\)/,
    });
    await expect(lockedButton).toBeVisible({ timeout: 5_000 });
    await expect(lockedButton).toBeDisabled();
    await expect.poll(() => requestCount).toBe(2);

    const countBeforeRapidClicks = requestCount;

    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.includes("Refresh ("),
      );
      for (let index = 0; index < 5; index += 1) {
        button?.click();
      }
    });

    await page.waitForTimeout(700);
    expect(requestCount).toBe(countBeforeRapidClicks);
  });

  test("an API 429 surfaces the backend rate-limit message through Sonner", async ({
    page,
  }) => {
    const date = dayjs().add(1, "day").format("YYYY-MM-DD");

    await page.route("**/api/v1/events**", async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname === "/api/v1/events") {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: { "retry-after": "60" },
          body: JSON.stringify({
            success: false,
            msg: "Rate limit exceeded. Please wait a moment before searching again.",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(eventPayload(date)),
      });
    });

    await login(page, USERS.viewer.email);
    await runEventSearch(page);

    await expect(
      page
        .getByText(
          "Rate limit exceeded. Please wait a moment before searching again.",
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
