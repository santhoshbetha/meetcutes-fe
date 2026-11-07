import { test, expect } from "@playwright/test";
import {
  API_URL,
  apiLogin,
  authHeaders,
  login,
  USERS,
} from "./helpers.js";

const AUSTIN = { lat: 30.2672, lng: -97.7431 };

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

async function createEvent(request, token, overrides = {}) {
  const response = await request.post(`${API_URL}/api/v1/events`, {
    headers: authHeaders(token),
    data: {
      title: overrides.title ?? `E2E Event ${Date.now()}`,
      location: overrides.location ?? "E2E Cafe",
      address1: overrides.address1 ?? "100 E2E St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      eventlat: AUSTIN.lat,
      eventlng: AUSTIN.lng,
      eventdate: overrides.eventdate ?? futureDate(14),
      start_time: overrides.start_time ?? "08:00",
      end_time: overrides.end_time ?? "10:00",
      description: "Created by the events E2E suite",
    },
  });

  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  return body.data.event;
}

async function getEvent(request, token, eventId) {
  const response = await request.get(`${API_URL}/api/v1/events/${eventId}`, {
    headers: authHeaders(token),
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.data.event;
}

test.describe("events", () => {
  test("creates, joins and leaves an event through the API", async ({
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const event = await createEvent(request, token, {
      title: "E2E API Event",
      location: "E2E API Venue",
      address1: "200 API Ave",
      eventdate: futureDate(14),
    });

    // The creator is always the bearer user, and new events are published.
    const profileResponse = await request.get(`${API_URL}/api/v1/profiles/me`, {
      headers: authHeaders(token),
    });
    const profile = (await profileResponse.json()).data.profile;
    expect(event.created_by).toBe(profile.id);
    expect(event.status).toBe("PUBLISHED");
    expect(event.attendees).toEqual([]);

    const joinResponse = await request.post(
      `${API_URL}/api/v1/events/${event.id}/join`,
      { headers: authHeaders(token) },
    );
    expect(joinResponse.ok(), await joinResponse.text()).toBeTruthy();

    const joined = await getEvent(request, token, event.id);
    expect(joined.attendees.map((attendee) => attendee.handle)).toEqual([
      USERS.viewer.handle,
    ]);

    const joinedList = await request.get(`${API_URL}/api/v1/events/joined`, {
      headers: authHeaders(token),
    });
    const joinedEvents = (await joinedList.json()).data.events;
    expect(joinedEvents.map((item) => item.id)).toContain(event.id);

    const leaveResponse = await request.delete(
      `${API_URL}/api/v1/events/${event.id}/join`,
      { headers: authHeaders(token) },
    );
    expect(leaveResponse.ok(), await leaveResponse.text()).toBeTruthy();

    const left = await getEvent(request, token, event.id);
    expect(left.attendees).toEqual([]);

    const joinedAfterLeave = await request.get(
      `${API_URL}/api/v1/events/joined`,
      { headers: authHeaders(token) },
    );
    const joinedAfterLeaveEvents = (await joinedAfterLeave.json()).data.events;
    expect(joinedAfterLeaveEvents.map((item) => item.id)).not.toContain(
      event.id,
    );
  });

  test("registers and unregisters from the event details page", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const title = "E2E UI Event";
    const event = await createEvent(request, token, {
      title,
      location: "E2E UI Venue",
      address1: "300 UI Blvd",
      eventdate: futureDate(21),
      start_time: "11:00",
      end_time: "13:00",
    });

    await login(page, USERS.viewer.email);

    // The created event appears in the "Events You Created" list.
    await page.goto("/dashboard?tab=events");
    await expect(
      page.getByRole("heading", { name: "Your Events" }),
    ).toBeVisible();
    await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });

    await page.goto(`/event/${event.id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByText("Successfully registered for this event!"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible();

    const afterJoin = await getEvent(request, token, event.id);
    expect(afterJoin.attendees.map((attendee) => attendee.handle)).toContain(
      USERS.viewer.handle,
    );

    await page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }).click();

    await expect(
      page.getByText("You've been unregistered from this event."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "REGISTER FOR THIS EVENT" }),
    ).toBeVisible();

    const afterLeave = await getEvent(request, token, event.id);
    expect(afterLeave.attendees).toEqual([]);
  });

  test("registers and unregisters from the event details dialog", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const suffix = Date.now();
    const title = `E2E Dialog Event ${suffix}`;

    await createEvent(request, token, {
      title,
      location: `E2E Dialog Venue ${suffix}`,
      address1: "400 Dialog Blvd",
      eventdate: futureDate(22),
      start_time: "14:00",
      end_time: "16:00",
    });

    await login(page, USERS.viewer.email);
    await page.goto("/dashboard?tab=events");
    await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });

    await page.getByText(title).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByText("Successfully registered for this event!"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }).click();

    await expect(
      page.getByText("You've been unregistered from this event."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "REGISTER FOR THIS EVENT" }),
    ).toBeVisible();
  });

  test("shows the fatigue warning when previous-event overlap is at least half", async ({
    page,
    request,
  }) => {
    const viewerToken = await apiLogin(request, USERS.viewer.email);
    const feedViewerToken = await apiLogin(request, USERS.feedViewer.email);
    const muteTargetToken = await apiLogin(request, USERS.muteTarget.email);
    const blockTargetToken = await apiLogin(request, USERS.blockTarget.email);
    const suffix = Date.now();

    const pastEvent = await createEvent(request, viewerToken, {
      title: `Fatigue Past ${suffix}`,
      location: `Fatigue Past Venue ${suffix}`,
      address1: "10 Past St",
      eventdate: futureDate(10),
      start_time: "08:00",
      end_time: "09:00",
    });

    for (const token of [viewerToken, feedViewerToken, muteTargetToken]) {
      const response = await request.post(
        `${API_URL}/api/v1/events/${pastEvent.id}/join`,
        { headers: authHeaders(token) },
      );
      expect(response.ok(), await response.text()).toBeTruthy();
    }

    const targetEvent = await createEvent(request, feedViewerToken, {
      title: `Fatigue Target ${suffix}`,
      location: `Fatigue Target Venue ${suffix}`,
      address1: "20 Target St",
      eventdate: futureDate(14),
      start_time: "10:00",
      end_time: "12:00",
    });

    for (const token of [feedViewerToken, muteTargetToken, blockTargetToken]) {
      const response = await request.post(
        `${API_URL}/api/v1/events/${targetEvent.id}/join`,
        { headers: authHeaders(token) },
      );
      expect(response.ok(), await response.text()).toBeTruthy();
    }

    const fatigueResponse = await request.get(
      `${API_URL}/api/v1/events/${targetEvent.id}/check-fatigue`,
      { headers: authHeaders(viewerToken) },
    );
    expect(await fatigueResponse.json()).toEqual({ is_fatigued: true });

    await login(page, USERS.viewer.email);
    await page.goto(`/event/${targetEvent.id}`);
    await expect(
      page.getByRole("heading", { name: `Fatigue Target ${suffix}` }),
    ).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByText(/More than half of this event attendees/),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Register", exact: true }).click();

    await expect(
      page.getByText("Successfully registered for this event!"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible();
  });
});
