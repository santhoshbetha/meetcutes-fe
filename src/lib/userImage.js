const ABSOLUTE_URL = /^(?:https?:|data:|blob:)/i;
const PROTOCOL_RELATIVE_URL = /^\/\//;

function firstString(values) {
  if (!Array.isArray(values)) return null;

  for (const value of values) {
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

function imageEntryToString(entry) {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed || null;
  }

  if (entry && typeof entry === "object") {
    return firstString([entry.url, entry.src, entry.path, entry.filename]);
  }

  return null;
}

/**
 * Vite only exposes `VITE_`-prefixed variables to the client. Keep these
 * accesses direct so the production build can statically replace them.
 */
function assetHost() {
  const host =
    import.meta.env.VITE_ASSET_HOST ||
    import.meta.env.VITE_CDN_URL ||
    import.meta.env.VITE_AWS_S3_ASSET_HOST ||
    "";

  return String(host).trim().replace(/\/+$/, "");
}

function imageCacheToken(user) {
  const raw =
    user?.images_updated_at ??
    user?.image_updated_at ??
    user?.updated_at ??
    user?.last_refreshed_at;

  if (raw == null) return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }

  const timestamp = new Date(raw).getTime();
  return Number.isFinite(timestamp) ? String(timestamp) : null;
}

/**
 * Adds a stable cache-busting token derived from the profile timestamp. Using
 * server metadata (instead of Date.now()) keeps images from churning on every
 * render while still refreshing immediately after a photo change.
 */
export function appendImageCacheBust(url, user) {
  if (!url || !/^https?:/i.test(url)) return url;

  const token = imageCacheToken(user);
  if (!token) return url;

  // Respect an existing cache-busting token instead of stacking duplicates.
  if (/(?:[?&])t=/.test(url)) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${encodeURIComponent(token)}`;
}

/**
 * Resolves a raw image filename/path against the configured R2/S3 asset host.
 * Full URLs are returned untouched so legacy records keep working.
 */
export function buildUserImageUrl(user, entry) {
  const candidate = imageEntryToString(entry);
  if (!candidate) return null;

  if (ABSOLUTE_URL.test(candidate)) {
    return candidate;
  }

  if (PROTOCOL_RELATIVE_URL.test(candidate)) {
    return `https:${candidate}`;
  }

  const host = assetHost();
  if (!host) return null;

  const cleaned = candidate.replace(/^\/+/, "");

  // Storage keys already include their full path; only prefix the CDN host.
  if (candidate.startsWith("/") || cleaned.includes("/")) {
    return `${host}/${cleaned}`;
  }

  const owner = user?.shortid || user?.userid || user?.id;
  return owner ? `${host}/${owner}/${cleaned}` : `${host}/${cleaned}`;
}

/**
 * Backend payloads usually contain absolute R2 URLs, but local storage can
 * return a root-relative path. Upgrade those to the configured asset host when
 * one is available.
 */
function normalizeResolvedUrl(url) {
  if (!url || ABSOLUTE_URL.test(url)) return url;

  if (PROTOCOL_RELATIVE_URL.test(url)) {
    return `https:${url}`;
  }

  const host = assetHost();
  return host ? `${host}/${url.replace(/^\/+/, "")}` : url;
}

/**
 * Returns the best available profile photo for a user snapshot.
 *
 * Priority:
 *   1. Backend-resolved `image_urls[0]` (Waffle already applies the host).
 *   2. Raw `images[0]`, resolved against the configured CDN asset host.
 *   3. Backend-resolved `avatar_url` / raw `avatar`.
 *
 * A `null` result means callers should render their initials avatar.
 */
export function resolveUserImage(user) {
  if (!user) return null;

  const resolved = firstString(user.image_urls);
  if (resolved) return appendImageCacheBust(normalizeResolvedUrl(resolved), user);

  const rawImages = Array.isArray(user.images) ? user.images : [];
  for (const entry of rawImages) {
    const url = buildUserImageUrl(user, entry);
    if (url) return appendImageCacheBust(url, user);
  }

  const avatarUrl = firstString([user.avatar_url]);
  if (avatarUrl) {
    return appendImageCacheBust(normalizeResolvedUrl(avatarUrl), user);
  }

  const rawAvatar = buildUserImageUrl(user, user.avatar);
  return rawAvatar ? appendImageCacheBust(rawAvatar, user) : null;
}
