import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { login, USERS } from "./helpers.js";

/**
 * Events date-filter integration coverage.
 *
 * The search tab builds a date-only window and sends it to
 * `GET /api/v1/events` as `start_date` / `end_date`. This test freezes the
 * payload at the network boundary and asserts the Tomorrow filter produces
 * the matching future ISO date string.
 */
function eventPayloadFor(date) {
  return {
    status: "success",
    data: {
      events: [
        {
          id: "event-tomorrow-austin",
          title: "Tomorrow at Zilker",
          content: "A proximity-accurate Austin event scheduled for tomorrow.",
          event_date: date,
          start_at: `${date}T18:00:00Z`,
          end_at: `${date}T20:00:00Z`,
          status: "PUBLISHED",
          attendees_count: 1,
          attendees: [],
          created_by: "austin-seed-owner",
          location: {
            id: "location-zilker-park",
            name: "Zilker Park",
            street: "2100 Barton Springs Rd",
            locality: "Austin",
            state: "TX",
            postal_code: "78704",
            latitude: 30.2669,
            longitude: -97.7729,
          },
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
    },
  };
}

test.describe("events search registration badge", () => {
  test("R badge follows the live events cache through register and leave", async ({
    page,
  }) => {
    await login(page, USERS.viewer.email);

    const viewer = await page.evaluate(async () => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      const profile = useAuthStore.getState().profiledata ?? {};
      return {
        id: profile.userid ?? profile.id,
        handle: profile.userhandle ?? profile.nickname,
      };
    });

    expect(viewer.id).toBeTruthy();
    expect(viewer.handle).toBeTruthy();

    const date = dayjs().add(1, "day").format("YYYY-MM-DD");
    let attendees = [];

    const attendee = {
      id: viewer.id,
      handle: viewer.handle,
      gender: "Male",
      first_name: "E2E",
      last_name: "Viewer",
    };

    const eventPayload = () => ({
      id: "event-r-badge-live",
      title: "R Badge Live Event",
      content: "Live cache registration indicator coverage.",
      event_date: date,
      start_at: `${date}T18:00:00Z`,
      end_at: `${date}T20:00:00Z`,
      status: "PUBLISHED",
      attendees_count: attendees.length,
      attendees,
      created_by: "r-badge-owner",
      location: {
        id: "location-r-badge",
        name: "R Badge Venue",
        street: "100 Cache St",
        locality: "Austin",
        state: "TX",
        postal_code: "78701",
        latitude: 30.2672,
        longitude: -97.7431,
      },
    });

    const respond = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    await page.route("**/api/v1/events**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path.endsWith("/check-fatigue")) {
        return respond(route, { is_fatigued: false });
      }

      if (path.endsWith("/join")) {
        attendees = method === "POST" ? [attendee] : [];
        return respond(route, {
          status: "success",
          data: { event: eventPayload(), attendee },
        });
      }

      if (path === "/api/v1/events" && method === "GET") {
        return respond(route, {
          status: "success",
          data: {
            events: [eventPayload()],
            pagination: { total: 1, limit: 20, offset: 0, has_more: false },
          },
        });
      }

      return route.continue();
    });

    await page.goto("/dashboard?tab=search");
    await expect(
      page.getByRole("heading", { name: "Discover Events" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: "Tomorrow", exact: true })
      .click();
    await page.getByRole("combobox").nth(1).click();
    await page
      .getByRole("option", { name: "5 Miles", exact: true })
      .click();
    await page.getByRole("button", { name: "Find Events" }).first().click();

    await expect(page.getByText("R Badge Live Event")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel("Registered for this event")).toHaveCount(0);

    await page.getByText("R Badge Live Event").click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Registered for this event")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByText("R Badge Live Event").click();
    await page
      .getByRole("button", { name: "UNREGISTER / LEAVE EVENT" })
      .click();
    await expect(
      page.getByRole("button", { name: "REGISTER FOR THIS EVENT" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Registered for this event")).toHaveCount(0, {
      timeout: 20_000,
    });
  });
});

test.describe("events search date filters", () => {
  test("Tomorrow sends the exact future ISO window to the Elixir events API", async ({
    page,
  }) => {
    await page.route("**/api/v1/events**", async (route) => {
      const url = new URL(route.request().url());

      if (
        url.pathname === "/api/v1/events" &&
        url.searchParams.has("start_date")
      ) {
        const startDate = url.searchParams.get("start_date");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(eventPayloadFor(startDate)),
        });
        return;
      }

      await route.continue();
    });

    await login(page, USERS.viewer.email);
    await page.goto("/dashboard?tab=search");

    await expect(
      page.getByRole("heading", { name: "Discover Events" }),
    ).toBeVisible({ timeout: 30_000 });

    // Date selector is the first visible combobox; distance is the second.
    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: "Tomorrow", exact: true })
      .click();

    await page.getByRole("combobox").nth(1).click();
    await page
      .getByRole("option", { name: "5 Miles", exact: true })
      .click();

    const expectedDate = dayjs().add(1, "day").format("YYYY-MM-DD");

    const requestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/v1/events" &&
        url.searchParams.has("start_date")
      );
    });

    await page.getByRole("button", { name: "Find Events" }).first().click();

    const request = await requestPromise;
    const requestUrl = new URL(request.url());

    expect(requestUrl.searchParams.get("start_date")).toBe(expectedDate);
    expect(requestUrl.searchParams.get("end_date")).toBe(expectedDate);

    await expect(page.getByText("Tomorrow at Zilker")).toBeVisible({
      timeout: 20_000,
    });
  });
});
