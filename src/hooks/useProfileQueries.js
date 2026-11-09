import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { authKeys } from "@/hooks/useAuthQueries";
import { toAuthUser } from "@/services/auth.service";
import {
  checkHandleAvailable,
  createRelationship,
  deactivateAccount,
  deleteRelationship,
  fetchMyProfile,
  fetchProfileById,
  fetchRelationships,
  fetchRelationshipUsers,
  fetchLikedUsersPage,
  fetchLikesReceivedPage,
  setHandle,
  updateMyProfile,
} from "@/services/profile.service";
import {
  deleteImage,
  reorderImages,
  uploadImage,
} from "@/services/image.service";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { USERS_SEARCH_QUERY_ROOT } from "@/hooks/useUsersSearch";

export const profileKeys = {
  all: ["profiles"],
  // Shared with the auth compatibility layer so both observers read one cache
  // entry for the signed-in user's profile.
  me: (token) => authKeys.profile(token),
  detail: (userId) => ["profiles", "detail", userId],
  relationships: (token) => ["relationships", token],
  relationshipDirectory: (kind, token) => ["relationships", "directory", kind, token],
  liked: (token) => ["relationships", "liked", token],
  likesReceived: (token) => ["relationships", "liked-by", token],
  handle: (handle) => ["profiles", "handle", handle],
};

function syncProfile(profile) {
  if (!profile) return;

  const store = useAuthStore.getState();
  store.setProfiledata(profile);
  store.setUser(toAuthUser(profile));
}

/**
 * Loads the signed-in user's profile from the Phase 2 endpoint and mirrors it
 * into the Zustand compatibility store.
 */
export function useMyProfileQuery() {
  const token = useAuthStore((state) => state.token);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: profileKeys.me(token),
    queryFn: fetchMyProfile,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });

  useEffect(() => {
    if (query.data) syncProfile(query.data);
  }, [query.data]);

  useEffect(() => {
    if (query.error?.status === 401) clearSession();
  }, [query.error, clearSession]);

  return query;
}

/**
 * Loads another user's public profile. A 404 means blocked, muted, missing, or
 * otherwise hidden, so retrying is pointless.
 */
export function useUserProfileQuery(userId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => fetchProfileById(userId),
    enabled: Boolean(token && userId),
    staleTime: 60 * 1000,
    retry: (failureCount, error) =>
      error?.status !== 404 && error?.status !== 401 && failureCount < 1,
  });
}

export function useUpdateProfileMutation({ invalidateSearch = true } = {}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile) => {
      syncProfile(profile);

      queryClient.setQueryData(profileKeys.me(token), profile);
      if (profile?.id) {
        queryClient.setQueryData(profileKeys.detail(profile.id), profile);
      }

      // Visibility, location, and settings changes can alter search results.
      // Background timestamp updates opt out so they do not invalidate a
      // freshly fetched discovery cache.
      if (invalidateSearch) {
        queryClient.invalidateQueries({ queryKey: USERS_SEARCH_QUERY_ROOT });
      }
    },
  });
}

/**
 * Keeps the Zustand profile and every profile cache in sync after a photo
 * upload, delete, or reorder.
 */
function applyProfileResult(queryClient, token, result) {
  const profile = result?.profile ?? result;
  if (!profile) return;

  syncProfile(profile);
  queryClient.setQueryData(profileKeys.me(token), profile);
  if (profile.id) {
    queryClient.setQueryData(profileKeys.detail(profile.id), profile);
  }
}

export function useUploadProfileImageMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: ({ file, slot }) => uploadImage(file, slot),
    onSuccess: (result) => applyProfileResult(queryClient, token, result),
  });
}

export function useDeleteProfileImageMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (slot) => deleteImage(slot),
    onSuccess: (result) => applyProfileResult(queryClient, token, result),
  });
}

export function useReorderProfileImagesMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (slots) => reorderImages(slots),
    onSuccess: (result) => applyProfileResult(queryClient, token, result),
  });
}

export function useDeactivateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      useProfileStore.getState().resetRelationships();
      useAuthStore.getState().clearSession();
      queryClient.clear();
    },
  });
}

export function useRelationshipsQuery() {
  const token = useAuthStore((state) => state.token);
  const setRelationships = useProfileStore((state) => state.setRelationships);

  const query = useQuery({
    queryKey: profileKeys.relationships(token),
    queryFn: fetchRelationships,
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });

  useEffect(() => {
    if (query.data) setRelationships(query.data);
  }, [query.data, setRelationships]);

  return query;
}

/**
 * Loads the blocked or muted user directory used by Settings.
 *
 * The directory is server-owned and refetched after every relationship
 * mutation, while the mutation hook also removes the row optimistically.
 */
export function useRelationshipDirectoryQuery(kind) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: profileKeys.relationshipDirectory(kind, token),
    queryFn: () => fetchRelationshipUsers(kind),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });
}

/**
 * People the signed-in user has liked within the backend's 100-mile radius.
 * Pages are capped at 20 profiles so the shortlist never renders an unbounded
 * history in one pass.
 */
export function useLikedUsers() {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: profileKeys.liked(token),
    queryFn: ({ pageParam = 1 }) => fetchLikedUsersPage(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });
}

/**
 * People who liked the signed-in user within the backend's 100-mile radius.
 */
export function useLikesReceived() {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: profileKeys.likesReceived(token),
    queryFn: ({ pageParam = 1 }) => fetchLikesReceivedPage(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    retry: (failureCount, error) => error?.status !== 401 && failureCount < 1,
  });
}

function removeUserFromSearchCaches(queryClient, targetId) {
  const normalizedTarget = String(targetId);

  queryClient.setQueriesData({ queryKey: USERS_SEARCH_QUERY_ROOT }, (data) => {
    if (!data?.pages || !Array.isArray(data.pages)) return data;

    return {
      ...data,
      pages: data.pages.map((page) => {
        if (!page || !Array.isArray(page.data)) return page;

        return {
          ...page,
          data: page.data.filter(
            (user) => String(user?.id ?? user?.userid) !== normalizedTarget,
          ),
        };
      }),
    };
  });
}

/**
 * Creates or removes a like/block/mute and keeps every dependent cache in sync.
 *
 * Block and mute immediately drop the target from cached search feeds and
 * invalidate the query so the server remains the source of truth.
 */
export function useRelationshipMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const setRelationships = useProfileStore((state) => state.setRelationships);

  return useMutation({
    mutationFn: ({ action = "create", kind, targetId }) =>
      action === "delete"
        ? deleteRelationship(kind, targetId)
        : createRelationship(kind, targetId),

    onSuccess: (relationships, variables) => {
      setRelationships(relationships);
      queryClient.setQueryData(profileKeys.relationships(token), relationships);

      if (
        (variables.kind === "block" || variables.kind === "mute") &&
        variables.action !== "delete"
      ) {
        removeUserFromSearchCaches(queryClient, variables.targetId);
        queryClient.removeQueries({
          queryKey: profileKeys.detail(variables.targetId),
        });
      }

      if (variables.kind === "block" || variables.kind === "mute") {
        const directoryKind =
          variables.kind === "block" ? "blocked" : "muted";

        if (variables.action === "delete") {
          queryClient.setQueryData(
            profileKeys.relationshipDirectory(directoryKind, token),
            (current) =>
              Array.isArray(current)
                ? current.filter(
                    (user) =>
                      String(user?.userid ?? user?.id) !==
                      String(variables.targetId),
                  )
                : current,
          );
        }
      }

      if (variables.kind === "like" && variables.action === "delete") {
        queryClient.setQueryData(profileKeys.liked(token), (current) => {
          if (!current?.pages) return current;

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              users: (page.users ?? []).filter(
                (user) =>
                  String(user?.userid ?? user?.id) !==
                  String(variables.targetId),
              ),
            })),
          };
        });
      }

      // Covers the summary, directories, shortlist and likes-received lists.
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: USERS_SEARCH_QUERY_ROOT });
    },
  });
}

export function useHandleAvailabilityQuery(handle, { enabled = true } = {}) {
  const trimmed = String(handle ?? "").trim();

  return useQuery({
    queryKey: profileKeys.handle(trimmed),
    queryFn: () => checkHandleAvailable(trimmed),
    enabled: enabled && trimmed.length >= 5,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSetHandleMutation() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: setHandle,
    onSuccess: (profile) => {
      syncProfile(profile);
      queryClient.setQueryData(profileKeys.me(token), profile);

      if (profile?.id) {
        queryClient.setQueryData(profileKeys.detail(profile.id), profile);
      }

      queryClient.invalidateQueries({ queryKey: USERS_SEARCH_QUERY_ROOT });
    },
  });
}
