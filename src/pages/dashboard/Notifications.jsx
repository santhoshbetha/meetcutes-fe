import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Heart,
  Inbox,
  Loader2,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useNotificationChannel } from "@/hooks/useNotificationChannel";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const PRESENTATIONS = {
  upcoming_event: {
    label: "Upcoming event",
    Icon: Calendar,
    iconClass:
      "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300",
    accentClass: "bg-sky-500/70",
    badgeClass:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  profile_like: {
    label: "New like",
    Icon: Heart,
    iconClass:
      "bg-pink-500/10 text-pink-600 ring-pink-500/20 dark:text-pink-300",
    accentClass: "bg-pink-500/70",
    badgeClass:
      "border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  admin_broadcast: {
    label: "Announcement",
    Icon: Megaphone,
    iconClass:
      "bg-amber-400/15 text-amber-600 ring-amber-400/30 dark:text-amber-300",
    accentClass: "bg-amber-400/80",
    badgeClass:
      "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  },
};

const FALLBACK_PRESENTATION = {
  label: "Notification",
  Icon: Bell,
  iconClass: "bg-primary/10 text-primary ring-primary/20",
  accentClass: "bg-primary/70",
  badgeClass: "border-primary/20 bg-primary/10 text-primary",
};

const FILTERS = [
  { id: "all", label: "All", Icon: Bell, type: null },
  { id: "likes", label: "Likes", Icon: Heart, type: "profile_like" },
  { id: "events", label: "Events", Icon: Calendar, type: "upcoming_event" },
  { id: "system", label: "System", Icon: Megaphone, type: "admin_broadcast" },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 45) return "Just now";
  if (absoluteSeconds < 60 * 60) {
    return relativeTimeFormatter.format(Math.round(seconds / 60), "minute");
  }
  if (absoluteSeconds < 60 * 60 * 24) {
    return relativeTimeFormatter.format(Math.round(seconds / 3600), "hour");
  }
  if (absoluteSeconds < 60 * 60 * 24 * 7) {
    return relativeTimeFormatter.format(Math.round(seconds / 86400), "day");
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function metadataValue(metadata, snakeKey, camelKey) {
  const value = metadata?.[snakeKey] ?? metadata?.[camelKey];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function NotificationCard({ notification, onMarkRead, isMarking }) {
  const presentation = PRESENTATIONS[notification.type] ?? FALLBACK_PRESENTATION;
  const Icon = presentation.Icon;
  const isRead = Boolean(notification.is_read);
  const metadata = notification.metadata ?? {};

  const eventId = metadataValue(metadata, "event_id", "eventId");
  const senderId = metadataValue(metadata, "sender_id", "senderId");

  const action =
    notification.type === "upcoming_event"
      ? {
          label: "View event",
          to: eventId ? `/event/${eventId}` : "/dashboard?tab=events",
        }
      : notification.type === "profile_like"
        ? { label: "See who liked you", to: "/dashboard/shortlist?tab=liked-you" }
        : null;

  const handleRead = () => {
    if (!isRead) onMarkRead(notification);
  };

  return (
    <article
      onClick={handleRead}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-5",
        isRead
          ? "border-border/50 bg-card/40 hover:border-border/70 hover:bg-card/60"
          : "cursor-pointer border-primary/15 bg-primary/5 shadow-sm hover:border-primary/25 hover:bg-primary/10",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-opacity duration-300",
          presentation.accentClass,
          isRead ? "opacity-30" : "opacity-100",
        )}
      />

      {!isRead && (
        <>
          <span
            aria-hidden="true"
            className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/10"
          />
          <span className="sr-only">Unread notification</span>
        </>
      )}

      <div className="flex items-start gap-3 pl-1">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105",
            presentation.iconClass,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge variant="outline" className={presentation.badgeClass}>
              {presentation.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.inserted_at)}
            </span>
          </div>

          <h3 className="mt-2 break-words text-sm font-bold text-foreground sm:text-base">
            {notification.title}
          </h3>

          {notification.body && (
            <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
              {notification.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {action && (
              <Button asChild size="sm" variant={isRead ? "outline" : "default"}>
                <Link
                  to={action.to}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRead();
                  }}
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            )}

            {notification.type === "profile_like" && senderId && (
              <Button asChild size="sm" variant="ghost">
                <Link
                  to={`/user/${senderId}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRead();
                  }}
                >
                  View profile
                </Link>
              </Button>
            )}

            {!isRead && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                disabled={isMarking}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRead();
                }}
              >
                {isMarking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isMarking ? "Marking..." : "Mark as read"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3" aria-label="Loading notifications">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="h-28 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
        />
      ))}
    </div>
  );
}

export function Notifications() {
  const { profiledata, userSession } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const notificationsQuery = useNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  useNotificationChannel({
    token: userSession?.access_token,
    userId: profiledata?.userid,
    enabled: Boolean(userSession?.access_token && profiledata?.userid),
  });

  const notifications = useMemo(
    () =>
      (notificationsQuery.data?.pages ?? []).flatMap(
        (page) => page.notifications ?? [],
      ),
    [notificationsQuery.data],
  );

  const filteredNotifications = useMemo(() => {
    const filter = FILTERS.find((candidate) => candidate.id === activeFilter);

    if (!filter?.type) return notifications;

    return notifications.filter(
      (notification) => notification.type === filter.type,
    );
  }, [notifications, activeFilter]);

  const filterCounts = useMemo(
    () =>
      FILTERS.reduce((counts, filter) => {
        counts[filter.id] = filter.type
          ? notifications.filter(
              (notification) => notification.type === filter.type,
            ).length
          : notifications.length;
        return counts;
      }, {}),
    [notifications],
  );

  const activeFilterLabel =
    FILTERS.find((filter) => filter.id === activeFilter)?.label ??
    "notifications";

  const firstPage = notificationsQuery.data?.pages?.[0];
  const unreadCount =
    firstPage?.unreadCount ??
    notifications.filter((notification) => !notification.is_read).length;
  const totalCount = firstPage?.pagination?.total ?? notifications.length;

  const handleMarkRead = (notification) => {
    if (!notification?.id || notification.is_read) return;

    markReadMutation.mutate(notification.id, {
      onError: (error) => {
        toast.error(
          error?.message || "Could not mark this notification as read.",
        );
      },
    });
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || markAllMutation.isPending) return;

    markAllMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.updated > 0
            ? `${result.updated} notification${result.updated === 1 ? "" : "s"} marked as read.`
            : "You are already caught up.",
        );
      },
      onError: (error) => {
        toast.error(
          error?.message || "Could not mark all notifications as read.",
        );
      },
    });
  };

  const markAllDisabled = unreadCount === 0 || markAllMutation.isPending;

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="mb-5">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <header className="relative mb-6 overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-5 shadow-xl backdrop-blur-lg sm:p-6">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-12 h-52 w-52 rounded-full bg-pink-500/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-fuchsia-500/15 to-transparent text-primary shadow-sm">
                <Bell className="h-6 w-6" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Inbox
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                  Notifications
                </h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Upcoming events, new likes, and announcements in one calm,
                  centralized feed.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="border-primary/20 bg-primary/10 text-primary"
                  >
                    {unreadCount} unread
                  </Badge>
                  <Badge variant="outline" className="border-border/60">
                    {totalCount} total
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllDisabled}
              aria-disabled={markAllDisabled}
              className={cn(
                "shrink-0 self-start sm:self-auto",
                unreadCount === 0 &&
                  "border border-border/60 bg-transparent text-muted-foreground opacity-50 hover:bg-transparent",
              )}
              variant={unreadCount === 0 ? "outline" : "default"}
            >
              <CheckCheck className="w-4 h-4 mr-2" aria-hidden="true" />
              {markAllMutation.isPending ? "Marking all..." : "Mark all as read"}
            </Button>
          </div>
        </header>

        <Tabs
          value={activeFilter}
          onValueChange={setActiveFilter}
          className="mb-5"
        >
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-card/40 p-1.5 shadow-xs backdrop-blur-md sm:w-fit">
            {FILTERS.map((filter) => {
              const Icon = filter.Icon;

              return (
                <TabsTrigger
                  key={filter.id}
                  value={filter.id}
                  className="h-9 flex-none gap-1.5 rounded-xl px-3.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {filter.label}
                  <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {filterCounts[filter.id] ?? 0}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {notificationsQuery.isLoading ? (
            <LoadingState />
          ) : notificationsQuery.isError ? (
            <Card className="border-destructive/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="px-4 pb-12 pt-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <Bell className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  Unable to load your inbox
                </h2>
                <p className="mx-auto mb-4 max-w-xs text-sm text-muted-foreground">
                  {notificationsQuery.error?.message ||
                    "Please check your connection and try again."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notificationsQuery.refetch()}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="px-4 pb-12 pt-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Inbox
                    className="h-6 w-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  You are all caught up
                </h2>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  New events, profile likes, and announcements will land here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredNotifications.length === 0 ? (
                <Card className="border-dashed bg-card/40 backdrop-blur-sm">
                  <CardContent className="px-4 pb-10 pt-10 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Inbox
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No {activeFilterLabel.toLowerCase()} notifications yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      isMarking={
                        markReadMutation.isPending &&
                        markReadMutation.variables === notification.id
                      }
                    />
                  ))}
                </div>
              )}

              {notificationsQuery.hasNextPage && (
                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => notificationsQuery.fetchNextPage()}
                    disabled={notificationsQuery.isFetchingNextPage}
                  >
                    {notificationsQuery.isFetchingNextPage ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {notificationsQuery.isFetchingNextPage
                      ? "Loading older notifications..."
                      : "Load older notifications"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
