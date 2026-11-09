import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

/**
 * Maps the backend's canonical snake_case profile into the legacy key names
 * that the rest of the React app still consumes.
 *
 * The original snake_case keys are kept too, so newer code can read either
 * shape while legacy components are migrated.
 */
export function mapProfileToLegacy(profile) {
  if (!profile) return null;

  const visibility =
    profile.visibility_preference ??
    profile.visibilityPreference ??
    profile.visibilitypreference ??
    "both";

  return {
    ...profile,
    userid: profile.id,
    userhandle: profile.nickname,
    firstname: profile.first_name,
    lastname: profile.last_name,
    phonenumber: profile.phone_number,
    dateoflocation: profile.date_of_location,
    dateofcoordinates: profile.date_of_coordinates,
    questionairevalues: profile.questionaire_values,
    questionairevaluesset: profile.questionaire_values_set,
    previouseventsattendeeslist: profile.previous_events_attendees_list,
    previouseventsattendeesdate: profile.previous_events_attendees_date,
    password_retry_count: profile.password_retry_count,
    onetimefeesrequired: profile.onetime_fees_required,
    onetimefeespaid: profile.onetime_fees_paid,
    acceptedonetimefeesamount: profile.accepted_onetime_fees_amount,
    aroundusercount: profile.around_user_count,
    aroundusercountupdatedat: profile.around_user_count_updated_at,
    subscriptionactive: profile.subscription_active,
    subscriptionexpiresat: profile.subscription_expires_at,
    emailsearch: profile.email_search,
    phonenumbersearch: profile.phone_number_search,
    userhandlesearch: profile.user_handle_search,
    onlyhundredmileevisiblity: profile.only_hundred_miles_visibility,
    defaultcoordsset: profile.default_coords_set,
    usercoordsset: profile.user_coords_set,
    exactcoordsset: profile.exact_coords_set,
    timeoflogin:
      profile.time_of_login ??
      profile.last_seen_at ??
      profile.last_active_at ??
      null,
    userstate: profile.user_state,
    idverified: profile.id_verified,
    termsaccepted: profile.terms_accepted ?? false,
    visibilityPreference: visibility,
    visibilitypreference: visibility,
    images: profile.images ?? [],
  };
}

/**
 * Builds the small auth-user shape the existing components expect
 * (`user.id` and `user.email`).
 */
export function toAuthUser(profile) {
  if (!profile) return null;

  return {
    id: profile.id ?? profile.userid,
    email: profile.email,
    confirmed_at: profile.confirmed_at,
    user_metadata: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      nickname: profile.nickname,
    },
  };
}

function applySession({ token, profile }) {
  const mappedProfile = mapProfileToLegacy(profile);
  const user = toAuthUser(mappedProfile);
  const store = useAuthStore.getState();

  store.setSession({ token, user, profiledata: mappedProfile });
  store.setJustLoggedIn(true);

  return { token, user, profiledata: mappedProfile };
}

export async function login({ email, password }) {
  const payload = await api.post(
    "/api/users/login",
    {
      action: "password",
      user: { email: String(email).trim(), password },
    },
    { auth: false },
  );

  if (!payload?.token) {
    throw new Error("The server did not return a session token.");
  }

  return applySession({ token: payload.token, profile: payload.user });
}

export async function register(user) {
  const payload = await api.post(
    "/api/users/register",
    { user },
    { auth: false },
  );

  const profile = mapProfileToLegacy(payload?.data?.user);

  // Confirmation-first environments return no session. When a token is
  // present, persist it immediately so the onboarding wizard can continue in
  // the same browser session.
  if (payload?.token) {
    applySession({ token: payload.token, profile });
  }

  return { user: profile, email: profile?.email, token: payload?.token ?? null };
}

export async function fetchProfile() {
  const payload = await api.get("/api/users/profile");
  const profile = mapProfileToLegacy(payload?.user ?? payload);
  const store = useAuthStore.getState();

  store.setUser(toAuthUser(profile));
  store.setProfiledata(profile);

  return profile;
}

export async function logout() {
  try {
    await api.delete("/api/users/logout");
  } catch {
    // The local session must be cleared even when the server token is already
    // gone or the network is unavailable.
  } finally {
    useAuthStore.getState().clearSession();
  }

  return { success: true };
}

export async function confirmEmail(token) {
  const payload = await api.post(
    `/api/users/confirm/${encodeURIComponent(token)}`,
    undefined,
    { auth: false },
  );

  return mapProfileToLegacy(payload?.user);
}

export async function resendConfirmation(email) {
  return api.post(
    "/api/users/resend_confirmation",
    { user: { email: String(email).trim() } },
    { auth: false },
  );
}

export async function requestPasswordReset(email) {
  return api.post(
    "/api/v1/auth/forgot-password",
    { user: { email: String(email).trim() } },
    { auth: false },
  );
}

/**
 * Checks whether an emailed reset token is still valid without consuming it.
 *
 * The backend returns 422 for expired or unknown tokens, which `api` surfaces
 * as an `ApiError` so the caller can show the message.
 */
export async function validatePasswordResetToken(token) {
  return api.get(
    `/api/v1/auth/reset-password/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

/**
 * Starts an email change. The backend verifies the current password and sends
 * a confirmation link to the new address; the account keeps its old email
 * until that link is confirmed.
 */
export async function requestEmailChange({ email, currentPassword }) {
  return api.put("/api/users/settings", {
    action: "update_email",
    user: {
      email: String(email).trim(),
      current_password: currentPassword,
    },
  });
}

/**
 * Confirms an email change from the emailed token. This is deliberately
 * unauthenticated because the link is opened from a mailbox.
 */
export async function confirmEmailChange(token) {
  return api.post(
    `/api/users/confirm_email_change/${encodeURIComponent(token)}`,
    undefined,
    { auth: false },
  );
}

export async function resetPassword(token, { password, passwordConfirmation }) {
  return api.post(
    `/api/v1/auth/reset-password/${encodeURIComponent(token)}`,
    {
      user: {
        password,
        password_confirmation: passwordConfirmation,
      },
    },
    { auth: false },
  );
}
