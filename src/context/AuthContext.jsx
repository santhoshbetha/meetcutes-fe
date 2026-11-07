/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import secureLocalStorage from "react-secure-storage";
import { setUnauthorizedHandler } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import { useProfileQuery } from "@/hooks/useAuthQueries";
import { usePresenceTracking } from "@/hooks/usePresenceTracking";
import { logout as logoutRequest } from "@/services/auth.service";
import { useAuthStore } from "@/stores/authStore";

const AuthContext = createContext(null);

function clearBrowserCaches() {
  try {
    localStorage.clear();
  } catch {
    // Ignore unavailable storage.
  }

  try {
    secureLocalStorage.clear();
  } catch {
    // Ignore unavailable storage.
  }
}

function forceDarkMode() {
  try {
    localStorage.setItem("theme", "dark");
  } catch {
    // Ignore unavailable storage.
  }

  document.documentElement.classList.add("dark");
}

/**
 * Compatibility layer over Zustand + TanStack Query.
 *
 * The exported value deliberately preserves the original `useAuth()` API so the
 * rest of the app can keep consuming `user`, `userSession`, `profiledata`,
 * `setProfiledata`, `profileLoading`, `justLoggedIn`, `resetJustLoggedIn` and
 * `logout` while the remaining components are migrated.
 */
export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profiledata = useAuthStore((state) => state.profiledata);
  const profileLoading = useAuthStore((state) => state.profileLoading);
  const justLoggedIn = useAuthStore((state) => state.justLoggedIn);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfiledata = useAuthStore((state) => state.setProfiledata);
  const resetJustLoggedIn = useAuthStore((state) => state.resetJustLoggedIn);
  const clearSession = useAuthStore((state) => state.clearSession);

  useProfileQuery();
  usePresenceTracking();

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Error during logout:", error);
    }

    disconnectSocket();
    clearSession();
    clearBrowserCaches();
    queryClient.clear();
    forceDarkMode();
  }, [clearSession, queryClient]);

  const setAuth = useCallback((authUser) => setUser(authUser), [setUser]);

  // Any authenticated request that receives a 401 means the opaque bearer
  // token is no longer valid. Flush the local session/storage and send the
  // user to the login page instead of leaving a half-signed-in UI behind.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      disconnectSocket();
      clearSession();
      clearBrowserCaches();
      queryClient.clear();
      forceDarkMode();
      navigate("/login", { replace: true });
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession, navigate, queryClient]);

  // Drop the realtime connection as soon as the session is cleared.
  useEffect(() => {
    if (!token) {
      disconnectSocket();
    }
  }, [token]);

  // Soft-deleted accounts are not allowed to stay signed in.
  useEffect(() => {
    if (profiledata?.userstate === "delete") {
      toast.error(
        "This account has been deleted. Please contact support if you believe this is an error.",
      );
      logout();
    }
  }, [profiledata?.userstate, logout]);

  const userSession = useMemo(
    () => (token ? { access_token: token } : null),
    [token],
  );

  const value = useMemo(
    () => ({
      user,
      userSession,
      profiledata,
      profileLoading,
      justLoggedIn,
      resetJustLoggedIn,
      setProfiledata,
      setAuth,
      logout,
    }),
    [
      user,
      userSession,
      profiledata,
      profileLoading,
      justLoggedIn,
      resetJustLoggedIn,
      setProfiledata,
      setAuth,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
