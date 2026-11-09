import { api } from "@/lib/api";
import { mapProfileToLegacy } from "@/services/auth.service";

/**
 * Turns any profile-shaped API payload into the legacy-mapped profile the
 * existing React components expect.
 */
export function unwrapProfile(payload) {
  const profile =
    payload?.data?.profile ??
    payload?.profile ??
    payload?.data?.user ??
    payload?.user ??
    payload?.data ??
    payload;

  return mapProfileToLegacy(profile);
}

function unwrapRelationships(payload) {
  return (
    payload?.data?.relationships ??
    payload?.relationships ??
    payload?.data ??
    payload ??
    {}
  );
}

/**
 * Builds a multipart body for PATCH /api/v1/profiles/me.
 *
 * Nested objects and arrays are JSON-encoded because the backend accepts both
 * JSON strings and native JSON values for those fields.
 */
export function toProfileFormData(attrs = {}) {
  const form = new FormData();

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof File !== "undefined" && value instanceof File) {
      form.append(key, value, value.name || key);
    } else if (typeof Blob !== "undefined" && value instanceof Blob) {
      form.append(key, value, key);
    } else if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  });

  return form;
}

export async function fetchMyProfile() {
  const payload = await api.get("/api/v1/profiles/me");
  return unwrapProfile(payload);
}

export async function fetchProfileById(userId) {
  if (!userId) return fetchMyProfile();

  const payload = await api.get(`/api/v1/profiles/${encodeURIComponent(userId)}`);
  return unwrapProfile(payload);
}

/**
 * Updates the authenticated user's profile.
 *
 * Accepts either a plain object (sent as JSON) or a pre-built FormData body
 * for avatar/banner uploads.
 */
export async function updateMyProfile(attrs) {
  const payload = await api.patch("/api/v1/profiles/me", attrs);
  return unwrapProfile(payload);
}

export async function deactivateAccount() {
  return api.delete("/api/v1/profiles/me");
}

export async function checkHandleAvailable(handle) {
  const trimmed = String(handle ?? "").trim();
  const payload = await api.get(
    `/api/v1/users/check-handle?handle=${encodeURIComponent(trimmed)}`,
  );
  const available = payload?.available ?? payload?.data?.available ?? false;

  return {
    success: true,
    handle: trimmed,
    available: Boolean(available),
    taken: !available,
  };
}

export async function setHandle(handle) {
  const payload = await api.patch("/api/v1/users/me/set-handle", {
    handle: String(handle ?? "").trim(),
  });

  return unwrapProfile(payload);
}

export async function fetchRelationships() {
  const payload = await api.get("/api/v1/relationships");
  const relationships = unwrapRelationships(payload);

  return {
    likes: relationships.likes ?? [],
    blocks: relationships.blocks ?? [],
    mutes: relationships.mutes ?? [],
    matches: relationships.matches ?? [],
  };
}

/**
 * Loads one relationship directory ("blocked" or "muted") with public profile
 * records so Settings can render an actionable management list.
 */
export async function fetchRelationshipUsers(kind) {
  const payload = await api.get(
    `/api/v1/relationships/${encodeURIComponent(kind)}`,
  );

  const users = payload?.data?.users ?? payload?.users ?? [];

  return (Array.isArray(users) ? users : []).map(mapProfileToLegacy);
}

function toCount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Loads one bounded page of the shortlist or liked-you directory.
 *
 * The backend caps pages at 20 profiles, so infinite queries never request an
 * unbounded interaction history.
 */
export async function fetchShortlistUsers(
  kind,
  { page = 1, perPage = 20 } = {},
) {
  const payload = await api.get(
    `/api/v1/relationships/${encodeURIComponent(kind)}?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`,
  );

  const data = payload?.data ?? payload ?? {};
  const users = Array.isArray(data.users) ? data.users : [];
  const pagination = data.pagination ?? {};

  return {
    users: users.map(mapProfileToLegacy),
    pagination: {
      page: toCount(pagination.page, page),
      perPage: toCount(pagination.per_page, perPage),
      total: toCount(pagination.total, users.length),
      totalPages: toCount(pagination.total_pages, 1),
      hasNextPage: Boolean(pagination.has_next_page),
    },
  };
}

export const fetchLikedUsersPage = (page, perPage = 20) =>
  fetchShortlistUsers("liked", { page, perPage });

export const fetchLikesReceivedPage = (page, perPage = 20) =>
  fetchShortlistUsers("liked-by", { page, perPage });

export const fetchBlockedUsers = () => fetchRelationshipUsers("blocked");
export const fetchMutedUsers = () => fetchRelationshipUsers("muted");
export const fetchLikedUsers = () => fetchRelationshipUsers("liked");
export const fetchLikesReceived = () => fetchRelationshipUsers("liked-by");

export async function createRelationship(kind, targetId) {
  const payload = await api.post("/api/v1/relationships", {
    kind,
    target_id: targetId,
  });

  return unwrapRelationships(payload);
}

export async function deleteRelationship(kind, targetId) {
  const payload = await api.delete(
    `/api/v1/relationships/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
  );

  return unwrapRelationships(payload);
}
