import { create } from "zustand";
import secureLocalStorage from "react-secure-storage";
import { setAuthTokenGetter } from "@/lib/api";

export const AUTH_TOKEN_KEY = "meetcutes.auth.token";
export const AUTH_USER_KEY = "meetcutes.auth.user";

function readStoredToken() {
  try {
    const stored = secureLocalStorage.getItem(AUTH_TOKEN_KEY);
    return typeof stored === "string" && stored.length > 0 ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) {
      secureLocalStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      secureLocalStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode, quota, SSR). The in-memory
    // session still works for the current tab.
  }
}

/**
 * Caches the tiny `{ id, email }` auth user so nav bars can render signed-in
 * state immediately on reload, before the profile query resolves.
 */
function readStoredUser() {
  try {
    const stored = secureLocalStorage.getItem(AUTH_USER_KEY);
    if (typeof stored !== "string" || stored.length === 0) return null;

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  try {
    if (user?.id) {
      secureLocalStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          id: user.id,
          email: user.email ?? null,
          confirmed_at: user.confirmed_at ?? null,
          user_metadata: user.user_metadata ?? {},
        }),
      );
    } else {
      secureLocalStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // Ignore unavailable storage; the in-memory user still works.
  }
}

/**
 * Client/session state only. Server data (profiles, events, searches) lives in
 * TanStack Query; this store just keeps the bearer token and the small pieces
 * of state that the existing `useAuth` consumers expect.
 */
const initialToken = readStoredToken();

export const useAuthStore = create((set, get) => ({
  token: initialToken,
  // Only restore the cached user when a token exists; otherwise a leftover
  // user key would render a signed-in nav with no session.
  user: initialToken ? readStoredUser() : null,
  profiledata: null,
  profileLoading: false,
  justLoggedIn: false,
  onboardingInProgress: false,

  setToken: (token) => {
    writeStoredToken(token);
    set({ token: token || null });
  },

  setUser: (user) => {
    writeStoredUser(user);
    set({ user });
  },

  setProfiledata: (profiledata) =>
    set({
      profiledata:
        typeof profiledata === "function"
          ? profiledata(get().profiledata)
          : profiledata,
    }),

  setProfileLoading: (profileLoading) => set({ profileLoading }),

  setJustLoggedIn: (justLoggedIn) => set({ justLoggedIn }),

  resetJustLoggedIn: () => set({ justLoggedIn: false }),

  setOnboardingInProgress: (onboardingInProgress) =>
    set({ onboardingInProgress: Boolean(onboardingInProgress) }),

  setSession: ({ token, user = null, profiledata = null }) => {
    writeStoredToken(token);
    writeStoredUser(user);
    set({ token: token || null, user, profiledata });
  },

  clearSession: () => {
    writeStoredToken(null);
    writeStoredUser(null);
    set({
      token: null,
      user: null,
      profiledata: null,
      profileLoading: false,
      justLoggedIn: false,
      onboardingInProgress: false,
    });
  },
}));

setAuthTokenGetter(() => useAuthStore.getState().token);

export default useAuthStore;
