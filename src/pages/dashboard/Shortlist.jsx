import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  HeartHandshake,
  HeartOff,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useLikedUsers,
  useLikesReceived,
  useRelationshipMutation,
} from "@/hooks/useProfileQueries";
import { resolveUserImage } from "@/lib/userImage";
import { formatMemberName } from "@/lib/displayName";

const MAX_DISTANCE_MILES = 100;

function withinRadius(user) {
  const distance = Number(user?.distance_miles);
  return !Number.isFinite(distance) || distance <= MAX_DISTANCE_MILES;
}

function displayName(user) {
  return formatMemberName(user) || user?.userhandle || "Member";
}

function userKey(user) {
  return String(user?.userid || user?.id || "");
}

function ShortlistCard({
  user,
  variant,
  matched = false,
  isPending = false,
  onAction,
  shortlistTab,
}) {
  const name = displayName(user);
  const avatar = resolveUserImage(user);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initial = (user?.firstname || user?.userhandle || "?").charAt(0).toUpperCase();
  const distance = Number(user?.distance_miles);
  const targetId = userKey(user);
  const isShortlist = variant === "shortlist";
  const Icon = isShortlist ? HeartOff : matched ? HeartHandshake : Heart;

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  const showAvatar = Boolean(avatar) && !avatarFailed;

  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/90 hover:shadow-sm dark:shadow-md dark:hover:shadow-lg ${
        matched
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/40 bg-card/60"
      }`}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-black text-primary ring-2 ring-muted/40 shadow-xs">
            {showAvatar ? (
              <img
                src={avatar}
                alt={name}
                loading="lazy"
                decoding="async"
                onError={() => setAvatarFailed(true)}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/user/${targetId}`}
                state={{ from: "shortlist", shortlistTab }}
                className="truncate text-base font-bold text-foreground transition-colors hover:text-primary"
              >
                {name}
              </Link>
              {matched && (
                <Badge className="shrink-0 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-300">
                  <HeartHandshake className="mr-1 h-3 w-3" />
                  Match!
                </Badge>
              )}
            </div>

            {user?.userhandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{user.userhandle}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {[user?.city, user?.state].filter(Boolean).join(", ") ||
                  "Nearby"}
              </span>
              {Number.isFinite(distance) && (
                <span className="font-semibold text-primary">
                  {distance.toFixed(1)} mi away
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <Link
            to={`/user/${targetId}`}
            state={{ from: "shortlist", shortlistTab }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            View profile
            <ArrowRight className="h-3 w-3" />
          </Link>

          <Button
            type="button"
            size="sm"
            variant={isShortlist ? "outline" : matched ? "secondary" : "default"}
            onClick={() => onAction(user)}
            disabled={isPending || matched}
            aria-label={
              isShortlist
                ? `Unlike ${name}`
                : matched
                  ? `Matched with ${name}`
                  : `Like back ${name}`
            }
            className={isShortlist ? "border-border/60" : ""}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="mr-2 h-3.5 w-3.5" />
            )}
            {isPending
              ? "Updating..."
              : isShortlist
                ? "Unlike"
                : matched
                  ? "Matched"
                  : "Like Back"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PanelState({ query, emptyTitle, emptyDescription }) {
  if (query.isLoading) {
    return (
      <Card className="border border-border/60 bg-card/40 backdrop-blur-lg">
        <CardContent className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading nearby profiles...
        </CardContent>
      </Card>
    );
  }

  if (query.error) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {query.error.message || "Unable to load this list right now."}
        </CardContent>
      </Card>
    );
  }

  if (!query.data?.length) {
    return (
      <Card className="border border-dashed border-border/70 bg-muted/20">
        <CardContent className="p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-base font-bold text-foreground">
            {emptyTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export function Shortlist() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("tab") === "liked-you" ? "liked-you" : "shortlist",
  );

  const handleTabChange = (value) => {
    setActiveTab(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === "liked-you") {
      nextParams.set("tab", "liked-you");
    } else {
      nextParams.delete("tab");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const likedQuery = useLikedUsers();
  const receivedQuery = useLikesReceived();
  const mutation = useRelationshipMutation();

  const likedUsers = useMemo(
    () => (likedQuery.data ?? []).filter(withinRadius),
    [likedQuery.data],
  );
  const receivedUsers = useMemo(
    () => (receivedQuery.data ?? []).filter(withinRadius),
    [receivedQuery.data],
  );

  const likedIds = useMemo(
    () => new Set(likedUsers.map((user) => userKey(user))),
    [likedUsers],
  );

  const pendingLike =
    mutation.isPending && mutation.variables?.kind === "like"
      ? mutation.variables
      : null;

  const isPendingFor = (user, action) =>
    Boolean(
      pendingLike &&
        pendingLike.action === action &&
        String(pendingLike.targetId) === userKey(user),
    );

  const handleUnlike = (user) => {
    mutation.mutate(
      { action: "delete", kind: "like", targetId: userKey(user) },
      {
        onSuccess: () => toast.success("Removed from your shortlist"),
        onError: (error) =>
          toast.error(error?.message || "Could not remove this like."),
      },
    );
  };

  const handleLikeBack = (user) => {
    mutation.mutate(
      { action: "create", kind: "like", targetId: userKey(user) },
      {
        onSuccess: () => toast.success(`You matched with ${displayName(user)}!`),
        onError: (error) =>
          toast.error(error?.message || "Could not like this profile back."),
      },
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-5 shadow-xl backdrop-blur-lg sm:p-6 md:p-8">
        <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-fuchsia-500/15 to-transparent text-primary shadow-sm sm:h-14 sm:w-14">
              <Heart className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Shortlist &amp; Likes
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                Your connections in motion
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Keep track of people you liked and discover who is interested in
                you, limited to your 100-mile radius.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-600 dark:text-fuchsia-300"
            >
              <Heart className="mr-1.5 h-3.5 w-3.5" />
              {likedUsers.length} liked
            </Badge>
            <Badge
              variant="secondary"
              className="border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {receivedUsers.length} interested
            </Badge>
          </div>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-muted/60 p-1">
          <TabsTrigger
            value="shortlist"
            className="h-10 rounded-xl text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            My Shortlist
            <Badge variant="secondary" className="ml-2 font-mono text-[10px] text-primary">
              {likedUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="liked-you"
            className="h-10 rounded-xl text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Liked You
            <Badge variant="secondary" className="ml-2 font-mono text-[10px] text-primary">
              {receivedUsers.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shortlist" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">People you liked</h2>
            <p className="text-sm text-muted-foreground">
              Nearby profiles you have already added to your shortlist.
            </p>
          </div>

          {likedUsers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {likedUsers.map((user) => (
                <ShortlistCard
                  key={userKey(user)}
                  user={user}
                  variant="shortlist"
                  shortlistTab={activeTab}
                  isPending={isPendingFor(user, "delete")}
                  onAction={handleUnlike}
                />
              ))}
            </div>
          ) : (
            <PanelState
              query={likedQuery}
              emptyTitle="Your shortlist is empty"
              emptyDescription="Like nearby profiles from search and they will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="liked-you" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">People who liked you</h2>
            <p className="text-sm text-muted-foreground">
              Like them back to turn an interested connection into a match.
            </p>
          </div>

          {receivedUsers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedUsers.map((user) => {
                const matched = likedIds.has(userKey(user));

                return (
                  <ShortlistCard
                    key={userKey(user)}
                    user={user}
                    variant="liked-you"
                    matched={matched}
                    shortlistTab={activeTab}
                    isPending={isPendingFor(user, "create")}
                    onAction={handleLikeBack}
                  />
                );
              })}
            </div>
          ) : (
            <PanelState
              query={receivedQuery}
              emptyTitle="No new likes yet"
              emptyDescription="When nearby members like your profile, they will show up here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Shortlist;
