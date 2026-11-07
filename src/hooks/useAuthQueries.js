import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmEmail,
  confirmEmailChange,
  fetchProfile,
  login,
  logout,
  register,
  requestEmailChange,
  requestPasswordReset,
  resendConfirmation,
  resetPassword,
  validatePasswordResetToken,
} from "@/services/auth.service";
import { useAuthStore } from "@/stores/authStore";

export const authKeys = {
  all: ["auth"],
  profile: (token) => ["auth", "profile", token],
};

/**
 * Loads the signed-in user's profile whenever a bearer token is present and
 * mirrors it into the Zustand compatibility store.
 */
export function useProfileQuery() {
  const token = useAuthStore((state) => state.token);
  const setProfiledata = useAuthStore((state) => state.setProfiledata);
  const setProfileLoading = useAuthStore((state) => state.setProfileLoading);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: authKeys.profile(token),
    queryFn: fetchProfile,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });

  useEffect(() => {
    setProfileLoading(query.isFetching);
  }, [query.isFetching, setProfileLoading]);

  useEffect(() => {
    if (query.data) {
      setProfiledata(query.data);
    }
  }, [query.data, setProfiledata]);

  useEffect(() => {
    if (query.error?.status === 401) {
      clearSession();
    }
  }, [query.error, clearSession]);

  return query;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      queryClient.setQueryData(
        authKeys.profile(result.token),
        result.profiledata,
      );
    },
  });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: register });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useConfirmEmailMutation() {
  return useMutation({ mutationFn: confirmEmail });
}

export function useResendConfirmationMutation() {
  return useMutation({ mutationFn: resendConfirmation });
}

export function useRequestPasswordResetMutation() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, password, passwordConfirmation }) =>
      resetPassword(token, { password, passwordConfirmation }),
  });
}

export function useValidatePasswordResetTokenMutation() {
  return useMutation({ mutationFn: validatePasswordResetToken });
}

export function useRequestEmailChangeMutation() {
  return useMutation({ mutationFn: requestEmailChange });
}

export function useConfirmEmailChangeMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: confirmEmailChange,
    onSuccess: () => {
      // The bearer session survives an email change, so refresh the cached
      // profile to show the new address immediately when the user is signed in.
      if (token) {
        queryClient.invalidateQueries({ queryKey: authKeys.profile(token) });
      }
    },
  });
}
