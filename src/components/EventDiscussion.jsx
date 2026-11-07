import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Check,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useDiscussion } from "@/hooks/useDiscussion";
import { describeApiError } from "@/lib/api";

const MAX_LENGTH = 5_000;

function initialsFor(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relativeTime(value) {
  if (!value) return "";

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "";
  }
}

/**
 * Event discussion thread.
 *
 * Reads and writes the explicit `/api/events/:event_id/comments` and
 * `/api/comments/:id` routes. Cache invalidation lives in `useDiscussion`.
 */
export function EventDiscussion({ eventId }) {
  const { userSession, profiledata } = useAuth();
  const currentUserId =
    profiledata?.userid ?? profiledata?.id ?? userSession?.user?.id ?? null;

  const {
    comments,
    isLoading,
    isError,
    error,
    refetch,
    createComment,
    updateComment,
    deleteComment,
    isCreating,
    isUpdating,
    isDeleting,
  } = useDiscussion(eventId);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState("");

  const handleCreate = async (event) => {
    event.preventDefault();
    const content = draft.trim();

    if (!content || isCreating) return;

    setActionError("");

    try {
      await createComment(content);
      setDraft("");
      toast.success("Comment posted");
    } catch (createError) {
      setActionError(
        describeApiError(createError, "Unable to post your comment."),
      );
    }
  };

  const startEditing = (comment) => {
    setConfirmDeleteId(null);
    setActionError("");
    setEditingId(comment.id);
    setEditingDraft(comment.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingDraft("");
  };

  const handleUpdate = async (commentId) => {
    const content = editingDraft.trim();

    if (!content || isUpdating) return;

    setActionError("");

    try {
      await updateComment({ id: commentId, content });
      cancelEditing();
      toast.success("Comment updated");
    } catch (updateError) {
      setActionError(
        describeApiError(updateError, "Unable to update your comment."),
      );
    }
  };

  const handleDelete = async (commentId) => {
    if (isDeleting) return;

    setActionError("");

    try {
      await deleteComment(commentId);
      setConfirmDeleteId(null);
      toast.success("Comment deleted");
    } catch (deleteError) {
      setActionError(
        describeApiError(deleteError, "Unable to delete your comment."),
      );
    }
  };

  return (
    <section className="space-y-6" data-testid="event-discussion">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessageCircle className="h-5 w-5 text-primary" />
            Discussion
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share plans, ask questions, and get to know the people going.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm text-primary">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Badge>
      </div>

      {currentUserId ? (
        <form onSubmit={handleCreate} className="space-y-3" data-testid="discussion-composer">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            placeholder="Add to the conversation…"
            rows={3}
            maxLength={MAX_LENGTH}
            aria-label="Write a comment"
            className="min-h-[96px] resize-y bg-background/70"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              disabled={!draft.trim() || isCreating}
              className="min-w-[140px]"
              data-testid="discussion-submit"
            >
              {isCreating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Posting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post comment
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
          Sign in to join the discussion.
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading comments">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="animate-pulse rounded-xl border border-border/40 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="h-4 w-40 rounded bg-muted" />
              </div>
              <div className="mt-3 h-3 w-full rounded bg-muted" />
              <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {describeApiError(error, "Unable to load the discussion.")}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">No comments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to start the conversation.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" data-testid="discussion-list">
          {comments.map((comment) => {
            const isOwner = String(comment.userId) === String(currentUserId);
            const isEditing = editingId === comment.id;
            const isConfirmingDelete = confirmDeleteId === comment.id;

            return (
              <li
                key={comment.id}
                data-testid={`comment-${comment.id}`}
                className="rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {comment.author.avatarUrl ? (
                      <AvatarImage
                        src={comment.author.avatarUrl}
                        alt={comment.author.name}
                      />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {initialsFor(comment.author.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {comment.author.name}
                      </span>
                      {comment.author.handle && (
                        <span className="text-sm text-muted-foreground">
                          @{comment.author.handle}
                        </span>
                      )}
                      {isOwner && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          You
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(comment.createdAt)}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={editingDraft}
                          onChange={(event) =>
                            setEditingDraft(
                              event.target.value.slice(0, MAX_LENGTH),
                            )
                          }
                          rows={3}
                          maxLength={MAX_LENGTH}
                          aria-label="Edit comment"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(comment.id)}
                            disabled={!editingDraft.trim() || isUpdating}
                          >
                            <Check className="h-4 w-4" />
                            {isUpdating ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                        {comment.content}
                      </p>
                    )}

                    {isOwner && !isEditing && (
                      <div className="mt-3 flex items-center gap-2">
                        {isConfirmingDelete ? (
                          <>
                            <span className="text-xs font-medium text-red-700">
                              Delete this comment?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(comment.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                              {isDeleting ? "Deleting…" : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(comment)}
                              aria-label="Edit comment"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setActionError("");
                                setConfirmDeleteId(comment.id);
                              }}
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default EventDiscussion;
