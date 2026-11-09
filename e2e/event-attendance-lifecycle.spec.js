import dayjs from "dayjs";
import { test, expect } from "@playwright/test";
import {
  mockEmptyNotificationInbox,
  apiLogin,
  API_URL,
  authHeaders,
  login,
  USERS,
} from "./helpers.js";

/**
 * Stateful attendance lifecycle coverage.
 *
 * The React client speaks the current v1 event contract:
 *   GET    /api/v1/events
 *   POST   /api/v1/events/:id/join
 *   DELETE /api/v1/events/:id/join
 *
 * The Elixir controller maps join/leave to the same attendance pipeline that
 * the legacy /register and /unregister names referenced, so this suite mocks
 * the actual client endpoints.
 */

const PROFILE = {
  id: "e2e-attendance-user",
  email: "e2e.attendance@meetcutes.test",
  nickname: "e2e_attendance",
  first_name: "Attendance",
  last_name: "Tester",
  gender: "Male",
  age: 30,
  city: "Austin",
  state: "TX",
  latitude: 30.2672,
  longitude: -97.7431,
  user_state: "active",
  terms_accepted: true,
  questionaire_values_set: true,
  onetime_fees_required: false,
  onetime_fees_paid: true,
  around_user_count: 0,
  subscription_active: true,
  images: [],
  image_urls: [],
  userid: "e2e-attendance-user",
  userhandle: "e2e_attendance",
  firstname: "Attendance",
  lastname: "Tester",
  userstate: "active",
  questionairevaluesset: true,
  onetimefeesrequired: false,
  onetimefeespaid: true,
  emailsearch: true,
  phonenumbersearch: false,
  userhandlesearch: true,
  onlyhundredmileevisiblity: false,
  visibilitypreference: "both",
};

const PRIMARY_EVENT_ID = "lifecycle-event-primary";
const FULL_EVENT_ID = "lifecycle-event-full";
const RESTRICTED_EVENT_ID = "lifecycle-event-restricted";
const PRIMARY_EVENT_TITLE = "Lifecycle Primary Event";
const FULL_EVENT_TITLE = "Lifecycle Full Event";
const RESTRICTED_EVENT_TITLE = "Lifecycle Restricted Event";
const R_BADGE_LABEL = "Registered for this event";

const respond = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

async function setupAttendanceHarness(
  page,
  { preRegistered = [], createdEvents = [] } = {},
) {
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const viewerAttendee = {
    id: PROFILE.id,
    handle: PROFILE.userhandle,
    gender: PROFILE.gender,
    first_name: PROFILE.first_name,
    last_name: PROFILE.last_name,
  };

  const attendeesByEvent = new Map([
    [PRIMARY_EVENT_ID, []],
    [FULL_EVENT_ID, []],
    [RESTRICTED_EVENT_ID, []],
  ]);

  preRegistered.forEach((eventId) => {
    attendeesByEvent.set(eventId, [viewerAttendee]);
  });

  const calls = {
    joins: [],
    leaves: [],
    updates: [],
    deletes: [],
    searches: 0,
  };

  let joinMode = "success";

  const eventPayload = (id, title) => {
    const attendees = attendeesByEvent.get(id) ?? [];
    const isRestricted = id === RESTRICTED_EVENT_ID;

    return {
      id,
      title,
      content: `Stateful attendance coverage for ${title}.`,
      event_date: tomorrow,
      start_at: `${tomorrow}T18:00:00Z`,
      end_at: `${tomorrow}T20:00:00Z`,
      status: "PUBLISHED",
      attendees_count: attendees.length,
      attendees,
      male_count: attendees.filter((a) => a.gender === "Male").length,
      female_count: attendees.filter((a) => a.gender === "Female").length,
      created_by: "attendance-owner",
      has_age_restriction: isRestricted,
      men_min_age: isRestricted ? 30 : null,
      men_max_age: isRestricted ? 40 : null,
      women_min_age: isRestricted ? 21 : null,
      women_max_age: isRestricted ? 45 : null,
      location: {
        id: "attendance-venue",
        name: "Attendance Test Venue",
        street: "100 Lifecycle Lane",
        locality: "Austin",
        state: "TX",
        postal_code: "78701",
        latitude: 30.2672,
        longitude: -97.7431,
      },
    };
  };

  const eventList = () => [
    eventPayload(PRIMARY_EVENT_ID, PRIMARY_EVENT_TITLE),
    eventPayload(FULL_EVENT_ID, FULL_EVENT_TITLE),
    eventPayload(RESTRICTED_EVENT_ID, RESTRICTED_EVENT_TITLE),
  ];

  const createdEventsState = createdEvents.map((event) => ({
    ...eventPayload(event.id, event.title ?? "Created Event"),
    ...event,
    created_by: PROFILE.id,
  }));

  await mockEmptyNotificationInbox(page);

  await page.route("**/api/users/profile", (route) =>
    respond(route, { status: "success", user: PROFILE }),
  );

  await page.route("**/api/v1/profiles/me**", (route) =>
    respond(route, { status: "success", data: { profile: PROFILE } }),
  );

  await page.route("**/api/v1/locations/autocomplete**", (route) =>
    respond(route, { data: { locations: [] } }),
  );

  await page.route("**/api/v1/events**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith("/check-fatigue")) {
      return respond(route, { is_fatigued: false });
    }

    if (path.endsWith("/join")) {
      const eventId = path.split("/").at(-2);

      if (method === "POST") {
        calls.joins.push({ method, eventId });

        if (joinMode === "already_attending") {
          attendeesByEvent.set(eventId, [viewerAttendee]);
          return respond(
            route,
            {
              status: "error",
              code: "already_attending",
              message: "You are already attending this event",
              errors: { event: ["already joined"] },
            },
            422,
          );
        }

        if (joinMode === "validation_failed") {
          return respond(
            route,
            {
              success: false,
              status: "error",
              msg: "Registration failed: Event is full",
              message: "Registration failed: Event is full",
            },
            422,
          );
        }

        if (joinMode === "age_restricted") {
          return respond(
            route,
            {
              success: false,
              status: "error",
              msg: "Registration failed: You do not match the specific age criteria set by the organizer for this event.",
              message:
                "Registration failed: You do not match the specific age criteria set by the organizer for this event.",
              errors: {
                age_restriction: [
                  "You do not match the specific age criteria set by the organizer for this event.",
                ],
              },
            },
            422,
          );
        }

        attendeesByEvent.set(eventId, [viewerAttendee]);
        return respond(route, {
          status: "success",
          data: {
            event: eventPayload(eventId, eventId === PRIMARY_EVENT_ID ? PRIMARY_EVENT_TITLE : FULL_EVENT_TITLE),
            attendee: viewerAttendee,
          },
        });
      }

      if (method === "DELETE") {
        calls.leaves.push({ method, eventId });
        attendeesByEvent.set(eventId, []);
        return respond(route, {
          status: "success",
          data: {
            event: eventPayload(eventId, eventId === PRIMARY_EVENT_ID ? PRIMARY_EVENT_TITLE : FULL_EVENT_TITLE),
            attendee: viewerAttendee,
          },
        });
      }
    }

    if (method === "PATCH" && path.startsWith("/api/v1/events/")) {
      const eventId = path.split("/").at(-1);
      const body = request.postDataJSON() ?? {};
      calls.updates.push({ method, eventId, body });

      const index = createdEventsState.findIndex(
        (event) => String(event.id) === String(eventId),
      );

      if (index === -1) {
        return respond(route, { status: "error", message: "Event not found" }, 404);
      }

      const current = createdEventsState[index];
      const eventDate = body.eventdate ?? current.event_date;
      const startTime = body.start_time ?? "08:00";
      const endTime = body.end_time ?? "09:00";

      const updated = {
        ...current,
        title: body.title ?? current.title,
        content: body.description ?? current.content,
        event_date: eventDate,
        start_at: `${eventDate}T${startTime}:00Z`,
        end_at: `${eventDate}T${endTime}:00Z`,
        location: {
          ...current.location,
          name: body.location ?? current.location?.name,
          street: body.address1 ?? current.location?.street,
          locality: body.city ?? current.location?.locality,
          state: body.state ?? current.location?.state,
          postal_code: body.zipcode ?? current.location?.postal_code,
        },
      };

      createdEventsState[index] = updated;
      return respond(route, { status: "success", data: { event: updated } });
    }

    if (method === "DELETE" && path.startsWith("/api/v1/events/")) {
      const eventId = path.split("/").at(-1);
      calls.deletes.push({ method, eventId });

      const index = createdEventsState.findIndex(
        (event) => String(event.id) === String(eventId),
      );

      if (index === -1) {
        return respond(route, { status: "error", message: "Event not found" }, 404);
      }

      createdEventsState[index] = {
        ...createdEventsState[index],
        status: "CANCELLED",
        attendees: [],
      };

      return respond(route, {
        status: "success",
        message: "Event canceled",
        data: { event: createdEventsState[index] },
      });
    }

    if (path.endsWith("/created")) {
      return respond(route, {
        status: "success",
        data: {
          events: createdEventsState,
          pagination: {
            total: createdEventsState.length,
            limit: 20,
            offset: 0,
            has_more: false,
          },
        },
      });
    }

    if (path.endsWith("/joined")) {
      const events = eventList().filter(
        (event) => (attendeesByEvent.get(event.id) ?? []).length > 0,
      );

      return respond(route, { status: "success", data: { events } });
    }

    if (
      method === "GET" &&
      path.startsWith("/api/v1/events/") &&
      path !== "/api/v1/events"
    ) {
      const eventId = path.split("/").at(-1);

      return respond(route, {
        status: "success",
        data: {
          event: eventPayload(
            eventId,
            eventId === PRIMARY_EVENT_ID
              ? PRIMARY_EVENT_TITLE
              : FULL_EVENT_TITLE,
          ),
        },
      });
    }

    if (path === "/api/v1/events" && method === "GET") {
      calls.searches += 1;
      return respond(route, {
        status: "success",
        data: {
          events: eventList(),
          pagination: { total: 2, limit: 20, offset: 0, has_more: false },
        },
      });
    }

    return respond(route, { status: "error", message: "Unhandled event route" }, 404);
  });

  await page.goto("/");
  await page.evaluate(async (profile) => {
    const { useAuthStore } = await import("/src/stores/authStore.js");
    useAuthStore.getState().setSession({
      token: "e2e-attendance-token",
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
        },
      },
      profiledata: profile,
    });
  }, PROFILE);

  await page.goto("/dashboard/events");
  await expect(
    page.getByRole("heading", { name: "Discover Events" }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Tomorrow", exact: true }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "5 Miles", exact: true }).click();
  await page.getByRole("button", { name: "Find Events" }).first().click();

  await expect(page.getByText(PRIMARY_EVENT_TITLE)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(FULL_EVENT_TITLE)).toBeVisible();

  return {
    calls,
    setJoinMode: (mode) => {
      joinMode = mode;
    },
  };
}

test.describe("event attendance lifecycle", () => {
  test("registration updates the modal and parent card, then leave reverses both", async ({
    page,
  }) => {
    const harness = await setupAttendanceHarness(page);

    await expect(page.getByLabel(R_BADGE_LABEL)).toHaveCount(0);

    await page.getByText(PRIMARY_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    const registerButton = page.getByRole("button", {
      name: "REGISTER FOR THIS EVENT",
    });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible({ timeout: 20_000 });

    expect(harness.calls.joins).toEqual([
      { method: "POST", eventId: PRIMARY_EVENT_ID },
    ]);

    await page.keyboard.press("Escape");
    await expect(page.getByLabel(R_BADGE_LABEL)).toBeVisible({
      timeout: 20_000,
    });

    await page.getByText(PRIMARY_EVENT_TITLE).click();
    const leaveButton = page.getByRole("button", {
      name: "UNREGISTER / LEAVE EVENT",
    });
    await expect(leaveButton).toBeVisible();
    await leaveButton.click();

    await expect(
      page.getByRole("button", { name: "REGISTER FOR THIS EVENT" }),
    ).toBeVisible({ timeout: 20_000 });

    expect(harness.calls.leaves).toEqual([
      { method: "DELETE", eventId: PRIMARY_EVENT_ID },
    ]);

    await page.keyboard.press("Escape");
    await expect(page.getByLabel(R_BADGE_LABEL)).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("already_attending conflicts restore the leave action gracefully", async ({
    page,
  }) => {
    const harness = await setupAttendanceHarness(page);
    harness.setJoinMode("already_attending");

    await page.getByText(PRIMARY_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByRole("button", { name: "UNREGISTER / LEAVE EVENT" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/already registered for this event/i)).toBeVisible();
  });

  test("explicit Ecto validation strings surface through the Sonner toast", async ({
    page,
  }) => {
    const harness = await setupAttendanceHarness(page);
    harness.setJoinMode("validation_failed");

    await page.getByText(FULL_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page
      .getByRole("button", { name: "REGISTER FOR THIS EVENT" })
      .click();

    await expect(
      page.getByText("Registration failed: Event is full").first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByRole("button", { name: "REGISTER FOR THIS EVENT" }),
    ).toBeVisible();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    expect(harness.calls.joins).toEqual([
      { method: "POST", eventId: FULL_EVENT_ID },
    ]);
  });

  test("age restriction failures surface the organizer criteria through Sonner", async ({
    page,
  }) => {
    const harness = await setupAttendanceHarness(page);
    harness.setJoinMode("age_restricted");

    await page.getByText(FULL_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    const registerButton = page.getByRole("button", {
      name: "REGISTER FOR THIS EVENT",
    });
    await registerButton.click();

    await expect(
      page
        .getByText(
          "Registration failed: You do not match the specific age criteria set by the organizer for this event.",
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(registerButton).toBeVisible();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    expect(harness.calls.joins).toEqual([
      { method: "POST", eventId: FULL_EVENT_ID },
    ]);
  });

  test("mobile event details open in-tab and return to the discovery grid", async ({
    page,
  }) => {
    await setupAttendanceHarness(page);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.getByText(PRIMARY_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page.getByRole("button", { name: "Open event page" }).click();

    await expect(page).toHaveURL(/\/event\/lifecycle-event-primary$/);
    await expect(
      page.getByRole("button", { name: "Back to Events" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Back to Events" }).click();

    await expect(page).toHaveURL(/\/dashboard\/events/);
    await expect(page.getByText(PRIMARY_EVENT_TITLE)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("discovery hides events outside the viewer's gender age bounds", async ({
    page,
  }) => {
    await setupAttendanceHarness(page);

    await expect(page.getByText(RESTRICTED_EVENT_TITLE)).toBeVisible();

    await page.evaluate(async (profile) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setProfiledata({ ...profile, age: 22 });
    }, PROFILE);

    await expect(page.getByText(RESTRICTED_EVENT_TITLE)).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText(PRIMARY_EVENT_TITLE)).toBeVisible();
  });

  test("direct event access locks registration when the viewer is outside the age bounds", async ({
    page,
  }) => {
    await setupAttendanceHarness(page);

    await page.getByText(RESTRICTED_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    const registerButton = page.getByRole("button", {
      name: "REGISTER FOR THIS EVENT",
    });
    await expect(registerButton).toBeEnabled();

    await page.evaluate(async (profile) => {
      const { useAuthStore } = await import("/src/stores/authStore.js");
      useAuthStore.getState().setProfiledata({ ...profile, age: 22 });
    }, PROFILE);

    await expect(
      page.getByRole("button", { name: "Age Requirement Mismatch" }),
    ).toBeDisabled({ timeout: 20_000 });
    await expect(
      page.getByText(
        "This event is restricted to organizers' specified age bounds.",
      ),
    ).toBeVisible();
  });

  test("unregistering from the dashboard clears the search R badge without refresh", async ({
    page,
  }) => {
    const harness = await setupAttendanceHarness(page, {
      preRegistered: [PRIMARY_EVENT_ID],
    });

    await expect(page.getByLabel(R_BADGE_LABEL)).toHaveCount(1);

    await page.getByRole("button", { name: /My Events/ }).click();
    await expect(page).toHaveURL(/tab=events/);

    await page.getByRole("tab", { name: "Events You're Attending" }).click();
    await expect(page.getByText("Your Upcoming Events")).toBeVisible();
    await expect(page.getByText(PRIMARY_EVENT_TITLE)).toBeVisible();

    await page.getByText(PRIMARY_EVENT_TITLE).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    await page
      .getByRole("button", { name: "UNREGISTER / LEAVE EVENT" })
      .click();

    await expect
      .poll(() => harness.calls.leaves.length, { timeout: 20_000 })
      .toBe(1);

    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Search Events/ }).click();
    await expect(page).toHaveURL(/tab=search/);
    await expect(page.getByText(PRIMARY_EVENT_TITLE)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel(R_BADGE_LABEL)).toHaveCount(0, {
      timeout: 30_000,
    });
  });

  test("editing a created event updates the venue in the grid", async ({
    page,
  }) => {
    const createdEvent = {
      id: "lifecycle-created-event",
      title: "Lifecycle Created Event",
    };

    const harness = await setupAttendanceHarness(page, {
      createdEvents: [createdEvent],
    });

    await page.getByRole("button", { name: /My Events/ }).click();
    await expect(page).toHaveURL(/tab=events/);
    await page.getByRole("tab", { name: /Events You Created/ }).click();

    await expect(page.getByText(createdEvent.title)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Attendance Test Venue")).toBeVisible();

    await page
      .getByRole("button", { name: `Edit ${createdEvent.title}` })
      .click();

    await expect(page.getByTestId("edit-event-form")).toBeVisible();
    await expect(page.getByLabel("Venue/Location Name")).toHaveValue(
      "Attendance Test Venue",
    );

    await page
      .getByLabel("Venue/Location Name")
      .fill("Updated Lifecycle Venue");
    await page.getByTestId("edit-event-submit").click();

    await expect(page.getByText("Updated Lifecycle Venue")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Attendance Test Venue")).toHaveCount(0);

    expect(harness.calls.updates).toHaveLength(1);
    expect(harness.calls.updates[0].eventId).toBe(createdEvent.id);
    expect(harness.calls.updates[0].body.location).toBe(
      "Updated Lifecycle Venue",
    );
  });

  test("canceling a created event confirms first and removes the card", async ({
    page,
  }) => {
    const createdEvent = {
      id: "lifecycle-delete-event",
      title: "Lifecycle Delete Event",
    };

    const harness = await setupAttendanceHarness(page, {
      createdEvents: [createdEvent],
    });

    await page.getByRole("button", { name: /My Events/ }).click();
    await page.getByRole("tab", { name: /Events You Created/ }).click();

    await expect(page.getByText(createdEvent.title)).toBeVisible({
      timeout: 20_000,
    });

    await page
      .getByRole("button", { name: `Delete ${createdEvent.title}` })
      .click();

    const dialog = page.getByTestId("cancel-event-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Are you sure you want to cancel this event? This action cannot be undone and will automatically notify all registered attendees.",
    );

    await page.getByRole("button", { name: "Cancel Event" }).click();

    await expect(page.getByText(createdEvent.title)).toHaveCount(0, {
      timeout: 20_000,
    });
    expect(harness.calls.deletes).toHaveLength(1);
    expect(harness.calls.deletes[0].eventId).toBe(createdEvent.id);
  });

  test("event edits notify a registered attendee over the real socket", async ({
    page,
    request,
  }) => {
    const ownerToken = await apiLogin(request, USERS.viewer.email);
    const attendeeToken = await apiLogin(request, USERS.blockTarget.email);
    const title = `Lifecycle Notify ${Date.now()}`;
    const eventDate = dayjs().add(10, "day").format("YYYY-MM-DD");
    const eventLocation = `Lifecycle Venue ${Date.now()}`;

    const createResponse = await request.post(`${API_URL}/api/v1/events`, {
      headers: authHeaders(ownerToken),
      data: {
        title,
        location: eventLocation,
        address1: "100 Notify St",
        city: "Austin",
        state: "TX",
        zip: "78701",
        eventlat: 30.2672,
        eventlng: -97.7431,
        eventdate: eventDate,
        start_time: "08:00",
        end_time: "10:00",
        description: "Lifecycle notification coverage",
      },
    });

    expect(createResponse.status(), await createResponse.text()).toBe(201);
    const event = (await createResponse.json()).data.event;

    const joinResponse = await request.post(
      `${API_URL}/api/v1/events/${event.id}/join`,
      { headers: authHeaders(attendeeToken) },
    );
    expect(joinResponse.ok(), await joinResponse.text()).toBeTruthy();

    await login(page, USERS.blockTarget.email);
    await page.goto("/notifications");

    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await page.waitForFunction(
      async () => {
        const { isSocketConnected } = await import("/src/lib/socket.js");
        return isSocketConnected();
      },
      null,
      { timeout: 20_000 },
    );
    await page.waitForTimeout(500);

    const updateResponse = await request.patch(
      `${API_URL}/api/v1/events/${event.id}`,
      {
        headers: authHeaders(ownerToken),
        data: {
          title,
          location: "Updated Lifecycle Venue",
          address1: "100 Notify St",
          city: "Austin",
          state: "TX",
          zip: "78701",
          eventlat: 30.2672,
          eventlng: -97.7431,
          eventdate: eventDate,
          start_time: "08:00",
          end_time: "10:00",
          description: "Updated lifecycle notification coverage",
        },
      },
    );

    expect(updateResponse.status(), await updateResponse.text()).toBe(200);

    const notificationBody = `Notice: The event '${title}' has updated its logistics (Date/Time or Venue). Please check the event page for details.`;
    const notificationCard = page
      .locator("article")
      .filter({ hasText: notificationBody })
      .first();

    await expect(notificationCard).toBeVisible({ timeout: 20_000 });
    await expect(
      notificationCard.getByRole("link", { name: "View event" }),
    ).toHaveAttribute("href", `/event/${event.id}`);
  });
});
