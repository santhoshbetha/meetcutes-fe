function isSameMember(user, viewer) {
  const targetId = user?.userid ?? user?.id;
  const viewerId = viewer?.userid ?? viewer?.id;

  return (
    targetId != null &&
    viewerId != null &&
    String(targetId) === String(viewerId)
  );
}

/**
 * Formats a member name for public surfaces.
 *
 * `hide_last_name` is ignored when the viewer is looking at their own profile
 * so personal dashboard cards keep the full name.
 */
export function formatMemberName(
  user,
  { viewer = null, style = "full", fallback = "" } = {},
) {
  const first = String(user?.firstname ?? user?.first_name ?? "").trim();
  const last = String(user?.lastname ?? user?.last_name ?? "").trim();
  const hideLast =
    Boolean(user?.hide_last_name ?? user?.hidelastname) &&
    !isSameMember(user, viewer);

  if (hideLast) {
    return first || fallback;
  }

  if (style === "initial") {
    if (!last) return first || fallback;
    return `${first} ${last.charAt(0).toUpperCase()}.`.trim();
  }

  if (style === "first") {
    return first || fallback;
  }

  return [first, last].filter(Boolean).join(" ") || fallback;
}
