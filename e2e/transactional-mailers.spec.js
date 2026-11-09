import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_URL,
  USERS,
  apiLogin,
  authHeaders,
  userIdByHandle,
} from "./helpers.js";

/**
 * Transactional mailer integration coverage.
 *
 * Scenario A drives the real React password-recovery form into the real
 * Phoenix endpoint, then inspects the Postgres-backed Oban queue to prove the
 * MailerWorker captured the rendered HTML/text email and resolved the reset
 * link to the production client domain.
 *
 * Scenario B creates a mutual like through the real relationship API and
 * verifies that the match context inserted NotificationWorker rows for both
 * sides without raising from the request lifecycle.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "../../meetcutes-elixir");

const MAIL_WORKER = "Meetcutes.Workers.MailerWorker";
const NOTIFICATION_WORKER = "Meetcutes.Workers.NotificationWorker";
const ACCEPTED_STATES = ["available", "scheduled", "executing", "completed"];

function recentObanJobs(worker, limit = 40) {
  const output = execSync("mix run --no-start priv/e2e/inspect_oban.exs", {
    cwd: backendDir,
    encoding: "utf8",
    shell: true,
    timeout: 60_000,
    env: {
      ...process.env,
      MIX_ENV: "dev",
      OBAN_WORKER: worker,
      OBAN_LIMIT: String(limit),
    },
  });

  const jsonLine = output
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  return JSON.parse(jsonLine);
}

function jobsSince(jobs, sinceMs) {
  return jobs.filter((job) => new Date(job.inserted_at).getTime() >= sinceMs);
}

test.describe("transactional mailer pipelines", () => {
  test("password reset form enqueues a fully rendered MailerWorker job", async ({
    page,
  }) => {
    let payload = null;
    const startedAt = Date.now() - 2_000;

    await page.route("**/api/v1/auth/forgot-password", async (route) => {
      payload = route.request().postDataJSON();
      await route.continue();
    });

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(USERS.viewer.email);
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    await expect(
      page
        .getByText("Password reset email sent! Please check your inbox")
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    expect(payload).toEqual({
      user: { email: USERS.viewer.email },
    });

    const jobs = jobsSince(recentObanJobs(MAIL_WORKER), startedAt);
    expect(jobs.length).toBeGreaterThan(0);

    const resetJob = jobs.find((job) => {
      const encoded = job.args?.encoded_email;
      if (typeof encoded !== "string") return false;

      const decoded = Buffer.from(encoded, "base64").toString("latin1");
      return decoded.includes("https://meetcutes.us/changepassword");
    });

    expect(
      resetJob,
      "expected a MailerWorker job containing the production reset URL",
    ).toBeTruthy();
    expect(ACCEPTED_STATES).toContain(resetJob.state);

    const decoded = Buffer.from(resetJob.args.encoded_email, "base64").toString(
      "latin1",
    );
    expect(decoded).toContain("Reset your Meetcutes password");
    expect(decoded).toContain("noreply@meetcutes.us");
  });

  test("mutual likes enqueue match-reminder Oban rows for both profiles", async ({
    request,
  }) => {
    const startedAt = Date.now() - 2_000;
    const viewerToken = await apiLogin(request, USERS.viewer.email);
    const feedViewerToken = await apiLogin(request, USERS.feedViewer.email);
    const viewerId = await userIdByHandle(
      request,
      viewerToken,
      USERS.viewer.handle,
    );
    const feedViewerId = await userIdByHandle(
      request,
      feedViewerToken,
      USERS.feedViewer.handle,
    );

    const firstLike = await request.post(`${API_URL}/api/v1/relationships`, {
      headers: authHeaders(viewerToken),
      data: { kind: "like", target_id: feedViewerId },
    });
    expect(firstLike.status(), await firstLike.text()).toBe(201);

    const reciprocalLike = await request.post(
      `${API_URL}/api/v1/relationships`,
      {
        headers: authHeaders(feedViewerToken),
        data: { kind: "like", target_id: viewerId },
      },
    );
    expect(reciprocalLike.status(), await reciprocalLike.text()).toBe(201);

    const reciprocalBody = await reciprocalLike.json();
    expect(reciprocalBody.data.relationships.matches).toContain(viewerId);

    const jobs = jobsSince(
      recentObanJobs(NOTIFICATION_WORKER),
      startedAt,
    );
    expect(jobs.length).toBeGreaterThanOrEqual(2);

    const args = jobs.map((job) => job.args);
    expect(args).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: viewerId,
          match_id: feedViewerId,
          action: "match_reminder",
        }),
        expect.objectContaining({
          user_id: feedViewerId,
          match_id: viewerId,
          action: "match_reminder",
        }),
      ]),
    );

    for (const job of jobs) {
      expect(
        ACCEPTED_STATES,
        `unexpected Oban state for job ${job.id}: ${job.state}`,
      ).toContain(job.state);
    }
  });
});
