import { useState } from "react";
import {
  Ban,
  Bell,
  BellOff,
  Heart,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useRelationshipMutation,
  useRelationshipsQuery,
} from "@/hooks/useProfileQueries";
import {
  isBlocked,
  isLiked,
  isMatched,
  isMuted,
  useProfileStore,
} from "@/stores/profileStore";

/**
 * Like / Mute / Block controls for a viewed profile.
 *
 * The relationships query is shared, so mounting this in a profile page and a
 * dialog at the same time still produces a single request.
 */
export function RelationshipActions({ targetId, targetName, className = "" }) {
  const { user } = useAuth();
  const relationships = useProfileStore((state) => state.relationships);
  const mutation = useRelationshipMutation();
  const [confirmBlock, setConfirmBlock] = useState(false);

  useRelationshipsQuery();

  if (!targetId || targetId === user?.id) return null;

  const liked = isLiked(relationships, targetId);
  const muted = isMuted(relationships, targetId);
  const blocked = isBlocked(relationships, targetId);
  const matched = isMatched(relationships, targetId);
  const pendingKind = mutation.isPending ? mutation.variables?.kind : null;
  const displayName = targetName || "this user";

  const run = (kind, action, successMessage) => {
    mutation.mutate(
      { kind, targetId, action },
      {
        onSuccess: () => toast.success(successMessage),
        onError: (error) =>
          toast.error(error?.message || "Could not update this relationship."),
      },
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button
        type="button"
        size="sm"
        variant={liked ? "default" : "outline"}
        onClick={() =>
          run(
            "like",
            liked ? "delete" : "create",
            liked ? "Like removed" : `Liked ${displayName}`,
          )
        }
        disabled={blocked || pendingKind === "like"}
        title={liked ? "Remove like" : "Like this profile"}
      >
        {pendingKind === "like" ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`mr-1.5 h-4 w-4 ${liked ? "fill-current" : ""}`} />
        )}
        {matched ? "Matched" : liked ? "Liked" : "Like"}
      </Button>

      <Button
        type="button"
        size="sm"
        variant={muted ? "secondary" : "outline"}
        onClick={() =>
          run(
            "mute",
            muted ? "delete" : "create",
            muted ? "Unmuted" : `Muted ${displayName}`,
          )
        }
        disabled={blocked || pendingKind === "mute"}
        title={muted ? "Unmute" : "Mute this profile"}
        className={muted ? "text-primary" : undefined}
      >
        {pendingKind === "mute" ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : muted ? (
          <BellOff className="mr-1.5 h-4 w-4" />
        ) : (
          <Bell className="mr-1.5 h-4 w-4" />
        )}
        {muted ? "Unmute" : "Mute"}
      </Button>

      {blocked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => run("block", "delete", "Unblocked")}
          disabled={pendingKind === "block"}
        >
          {pendingKind === "block" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1.5 h-4 w-4" />
          )}
          Unblock
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setConfirmBlock(true)}
            disabled={pendingKind === "block"}
            title="Block this profile"
          >
            {pendingKind === "block" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-1.5 h-4 w-4" />
            )}
            Block
          </Button>

          <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Block {displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Blocking removes any likes between you and hides each other
                  from feeds, searches, and direct profile views. You can
                  unblock later from this profile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => {
                    run("block", "create", `Blocked ${displayName}`);
                    setConfirmBlock(false);
                  }}
                >
                  Block
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

export default RelationshipActions;
