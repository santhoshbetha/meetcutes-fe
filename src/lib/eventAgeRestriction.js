function normalizeGender(gender) {
  const normalized = String(gender ?? "")
    .trim()
    .toLowerCase();

  if (normalized.startsWith("m")) return "male";
  if (normalized.startsWith("f")) return "female";
  return null;
}

/**
 * Mirrors the backend gender-specific age bounds.
 *
 * Restricted events are only eligible when the viewer's profile has a valid
 * age and the matching gender range includes it. Missing bounds or an unknown
 * gender are treated as ineligible, matching the SQL discovery filter.
 */
export function isAgeEligibleForEvent(event, user) {
  if (!event?.has_age_restriction) return true;

  const age = Number(user?.age);
  if (!Number.isFinite(age)) return false;

  const gender = normalizeGender(user?.gender);
  const minKey =
    gender === "male"
      ? "men_min_age"
      : gender === "female"
        ? "women_min_age"
        : null;
  const maxKey =
    gender === "male"
      ? "men_max_age"
      : gender === "female"
        ? "women_max_age"
        : null;

  if (!minKey || !maxKey) return false;

  const minAge = Number(event[minKey]);
  const maxAge = Number(event[maxKey]);

  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) return false;

  return age >= minAge && age <= maxAge;
}
