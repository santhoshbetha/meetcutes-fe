import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import {
  createComment,
  deleteComment,
  fetchComments,
  normalizeComment,
  updateComment,
} from "@/services/discussion.service";

export const discussionKeys = {
  all: ["discussion"],
  list: (eventId) => ["discussion", String(eventId)],
};

function commentFromPayload(raw) {
  return normalizeComment(raw?.comment ?? raw);
}

function upsertCommentInCache(queryClient, queryKey, raw) {
  const comment = commentFromPayload(raw);
  if (!comment?.id) return;

  queryClient.setQueryData(queryKey, (current) => {
    const comments = Array.isArray(current) ? current : [];
    const index = comments.findIndex(
      (existing) => String(existing.id) === String(comment.id),
    );

    if (index === -1) return [...comments, comment];

    const next = [...comments];
    next[index] = { ...comments[index], ...comment };
    return next;
  });
}

function removeCommentFromCache(queryClient, queryKey, raw) {
  const id = raw?.comment_id ?? raw?.comment?.id ?? raw?.id;
  if (id === undefined || id === null) return;

  queryClient.setQueryData(queryKey, (current) => {
    const comments = Array.isArray(current) ? current : [];
    return comments.filter(
      (comment) => String(comment.id) !== String(id),
    );
  });
}

/**
 * Loads and mutates the comment thread for one event.
 *
 * TanStack Query owns the cache. Every create/update/delete updates that cache
 * in place, and the `events:discussion:<event_id>` Phoenix channel appends
 * comments from other attendees without a follow-up REST request.
 */
export function useDiscussion(eventId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const queryKey = useMemo(() => discussionKeys.list(eventId), [eventId]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchComments(eventId),
    enabled: Boolean(enabled && eventId && token),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (content) => createComment(eventId, content),
    onSuccess: (comment) =>
      upsertCommentInCache(queryClient, queryKey, comment),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }) => updateComment(id, content),
    onSuccess: (comment) =>
      upsertCommentInCache(queryClient, queryKey, comment),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteComment(id),
    onSuccess: (id) => removeCommentFromCache(queryClient, queryKey, id),
  });

  // Subscribe to the event's discussion topic so every participant sees new,
  // edited and deleted comments without refreshing the page.
  useEffect(() => {
    if (!enabled || !token || !eventId) return undefined;

    const socket = acquireSocket(token);
    if (!socket) return undefined;

    const channel = socket.channel(`events:discussion:${eventId}`, {});

    const handleComment = (payload) =>
      upsertCommentInCache(queryClient, queryKey, payload);
    const handleDeleted = (payload) =>
      removeCommentFromCache(queryClient, queryKey, payload);

    channel.on("new_comment", handleComment);
    channel.on("comment_updated", handleComment);
    channel.on("comment_deleted", handleDeleted);

    channel.join().receive("error", (reason) => {
      console.warn("Unable to join discussion channel", reason);
    });

    return () => {
      channel.leave();
      releaseSocket();
    };
  }, [enabled, eventId, token, queryClient, queryKey]);

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createComment: createMutation.mutateAsync,
    updateComment: updateMutation.mutateAsync,
    deleteComment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}

export default useDiscussion;
