import { test, expect } from "@playwright/test";
import { API_URL, USERS, apiLogin, authHeaders, login } from "./helpers.js";

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe("realtime event attendees", () => {
  test("updates attendee counts over the Phoenix socket without a reload", async ({
    page,
    request,
  }) => {
    const creatorToken = await apiLogin(request, USERS.viewer.email);

    const createResponse = await request.post(`${API_URL}/api/v1/events`, {
      headers: authHeaders(creatorToken),
      data: {
        title: "Live Attendee Event",
        location: "Live Venue",
        address1: "500 Live Oak St",
        city: "Austin",
        state: "TX",
        zip: "78701",
        eventlat: 30.2672,
        eventlng: -97.7431,
        eventdate: futureDate(14),
        start_time: "18:00",
        end_time: "20:00",
        description: "Realtime socket coverage",
      },
    });

    expect(createResponse.status(), await createResponse.text()).toBe(201);
    const created = await createResponse.json();
    const eventId = created.data.event.id;

    await login(page, USERS.viewer.email);
    await page.goto(`/event/${eventId}`);
    await expect(page.getByText("Live Attendee Event").first()).toBeVisible();

    const femalesCard = page
      .locator("div")
      .filter({ hasText: "Females" })
      .last();
    await expect(femalesCard.locator("p").first()).toHaveText("0");

    // Give the Phoenix socket a moment to finish joining the event topic.
    await page.waitForTimeout(1500);

    const joinerToken = await apiLogin(request, USERS.feedViewer.email);
    const joinResponse = await request.post(
      `${API_URL}/api/v1/events/${eventId}/join`,
      { headers: authHeaders(joinerToken) },
    );
    expect(joinResponse.status(), await joinResponse.text()).toBe(200);

    // No reload: the channel broadcast invalidates the event query.
    await expect(femalesCard.locator("p").first()).toHaveText("1", {
      timeout: 15_000,
    });
  });
});
