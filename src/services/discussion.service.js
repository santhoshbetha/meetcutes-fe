import { api } from "@/lib/api";

/**
 * Normalizes the backend's canonical comment payload into the shape the
 * discussion UI renders.
 *
 * The API speaks snake_case; keeping the mapping here means the components
 * never have to know about `inserted_at` vs `createdAt` or `user.avatar_url`.
 */
export function normalizeComment(comment) {
  if (!comment) return null;

  const user = comment.user || {};
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.handle ||
    user.nickname ||
    "Member";

  return {
    id: comment.id,
    content: comment.content ?? "",
    userId: comment.user_id ?? comment.userId ?? user.id ?? null,
    eventId: comment.event_id ?? comment.eventId ?? null,
    author: {
      id: user.id ?? comment.user_id ?? null,
      handle: user.handle ?? user.nickname ?? "",
      name: displayName,
      avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
    },
    createdAt: comment.inserted_at ?? comment.created_at ?? null,
    updatedAt: comment.updated_at ?? null,
  };
}

function unwrapComment(payload) {
  return (
    payload?.data?.comment ??
    payload?.comment ??
    payload?.data ??
    payload ??
    null
  );
}

function unwrapList(payload) {
  const list =
    payload?.data?.comments ??
    payload?.comments ??
    payload?.data ??
    payload ??
    [];

  return Array.isArray(list) ? list : [];
}

function commentPath(eventId) {
  return `/api/events/${encodeURIComponent(eventId)}/comments`;
}

function singleCommentPath(commentId) {
  return `/api/comments/${encodeURIComponent(commentId)}`;
}

export async function fetchComments(eventId, options = {}) {
  const payload = await api.get(commentPath(eventId), options);
  return unwrapList(payload).map(normalizeComment).filter(Boolean);
}

export async function createComment(eventId, content) {
  const payload = await api.post(commentPath(eventId), {
    comment: { content },
  });

  return normalizeComment(unwrapComment(payload));
}

export async function updateComment(commentId, content) {
  const payload = await api.put(singleCommentPath(commentId), {
    comment: { content },
  });

  return normalizeComment(unwrapComment(payload));
}

export async function deleteComment(commentId) {
  await api.delete(singleCommentPath(commentId));
  return commentId;
}
