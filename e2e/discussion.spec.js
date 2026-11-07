import { test, expect } from "@playwright/test";
import {
  API_URL,
  USERS,
  apiLogin,
  authHeaders,
  login,
} from "./helpers.js";

const AUSTIN = { lat: 30.2672, lng: -97.7431 };

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

async function createEvent(request, token, overrides = {}) {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const response = await request.post(`${API_URL}/api/v1/events`, {
    headers: authHeaders(token),
    data: {
      title: overrides.title ?? `E2E Discussion ${unique}`,
      location: overrides.location ?? `E2E Discussion Venue ${unique}`,
      address1: overrides.address1 ?? `${Math.floor(Math.random() * 900) + 100} Discussion St`,
      city: "Austin",
      state: "TX",
      zip: "78701",
      eventlat: AUSTIN.lat,
      eventlng: AUSTIN.lng,
      eventdate: overrides.eventdate ?? futureDate(overrides.days ?? 14),
      start_time: overrides.start_time ?? "08:00",
      end_time: overrides.end_time ?? "10:00",
      description: "Created by the discussion E2E suite",
    },
  });

  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  return body.data.event;
}

test.describe("event discussion", () => {
  test("posts, edits and deletes a comment from the event page", async ({
    page,
    request,
  }) => {
    const token = await apiLogin(request, USERS.viewer.email);
    const event = await createEvent(request, token, {
      title: "E2E Discussion Event",
    });

    await login(page, USERS.viewer.email);
    await page.goto(`/event/${event.id}`);
    await expect(
      page.getByRole("heading", { name: "E2E Discussion Event" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: "Discussion" }).click();
    await expect(page.getByTestId("event-discussion")).toBeVisible();
    await expect(page.getByText("No comments yet")).toBeVisible();

    await page.getByLabel("Write a comment").fill("First discussion comment");
    await page.getByTestId("discussion-submit").click();

    await expect(page.getByText("First discussion comment")).toBeVisible({
      timeout: 15_000,
    });

    // The comment was persisted through the explicit event-comments route.
    const listResponse = await request.get(
      `${API_URL}/api/events/${event.id}/comments`,
      { headers: authHeaders(token) },
    );
    expect(listResponse.ok(), await listResponse.text()).toBeTruthy();
    const list = (await listResponse.json()).data;
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe("First discussion comment");
    expect(list[0].event_id).toBe(event.id);

    // Edit through PUT /api/comments/:id.
    await page.getByRole("button", { name: "Edit comment" }).click();
    await page.getByLabel("Edit comment").fill("Edited discussion comment");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Edited discussion comment")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("First discussion comment")).toHaveCount(0);

    // Delete through DELETE /api/comments/:id.
    await page.getByRole("button", { name: "Delete comment" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByText("No comments yet")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("rejects updates and deletes from a different bearer user", async ({
    request,
  }) => {
    const authorToken = await apiLogin(request, USERS.viewer.email);
    const otherToken = await apiLogin(request, USERS.feedViewer.email);

    const event = await createEvent(request, authorToken, {
      title: "E2E Discussion Ownership",
      days: 15,
      start_time: "12:00",
      end_time: "14:00",
    });

    const createResponse = await request.post(
      `${API_URL}/api/events/${event.id}/comments`,
      {
        headers: authHeaders(authorToken),
        data: {
          comment: {
            content: "Owned by the viewer",
            // Identity/event fields must be ignored by the backend.
            user_id: "spoofed-user",
            event_id: "spoofed-event",
          },
        },
      },
    );

    expect(createResponse.status(), await createResponse.text()).toBe(201);
    const comment = (await createResponse.json()).data;
    expect(comment.user_id).not.toBe("spoofed-user");
    expect(comment.event_id).toBe(event.id);

    const updateResponse = await request.put(
      `${API_URL}/api/comments/${comment.id}`,
      {
        headers: authHeaders(otherToken),
        data: { comment: { content: "Hijacked" } },
      },
    );
    expect(updateResponse.status(), await updateResponse.text()).toBe(403);

    const deleteResponse = await request.delete(
      `${API_URL}/api/comments/${comment.id}`,
      { headers: authHeaders(otherToken) },
    );
    expect(deleteResponse.status(), await deleteResponse.text()).toBe(403);

    // The original author can still delete their comment.
    const authorDelete = await request.delete(
      `${API_URL}/api/comments/${comment.id}`,
      { headers: authHeaders(authorToken) },
    );
    expect(authorDelete.status(), await authorDelete.text()).toBe(204);
  });
});
