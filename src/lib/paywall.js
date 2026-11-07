/**
 * Reads the premium gate from the canonical profile fields with legacy
 * camelCase fallbacks for older cached sessions.
 */
export function isSubscriptionActive(profile) {
  if (!profile) return false;

  const active =
    profile.subscription_active ?? profile.subscriptionactive ?? false;

  if (!active) return false;

  const expiresAt =
    profile.subscription_expires_at ?? profile.subscriptionexpiresat ?? null;

  if (!expiresAt) return true;

  const timestamp = new Date(expiresAt).getTime();
  return Number.isNaN(timestamp) || timestamp > Date.now();
}

export function aroundUserCount(profile) {
  const count = Number(
    profile?.around_user_count ?? profile?.aroundusercount ?? 0,
  );

  return Number.isFinite(count) ? count : 0;
}

export function isPremiumPaywallActive(profile) {
  return aroundUserCount(profile) > 200 && !isSubscriptionActive(profile);
}
