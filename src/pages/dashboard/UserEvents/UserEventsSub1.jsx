import { lazy, Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventList } from "@/components/EventList";
import { useCancelEvent, useUserEvents1 } from "@/hooks/useEvents";
import { EditEventDialog } from "@/components/EditEventDialog";
import { isObjEmpty } from "@/utils/util";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Sparkles, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CreateEvent = lazy(() => import("@/components/CreateEvent").then((module) => ({ default: module.CreateEvent })));

const CreateEventFallback = () => (
  <div className="p-6 text-sm text-center font-medium text-muted-foreground animate-pulse">
    Loading event form components...
  </div>
);

export function UserEventsSub1({ profiledata, userhandle, latitude, longitude, error }) {
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const lastRefetchRef = useRef(0);
  const cancelEventMutation = useCancelEvent();

  const {
    isLoading,
    isFetching,
    error: queryError,
    data: infiniteData,
    refetch,
    isFetched,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserEvents1();

  const data = useMemo(
    () =>
      (infiniteData?.pages?.flatMap((page) => page?.data ?? []) ?? []).filter(
        (event) => event?.status !== "CANCELLED",
      ),
    [infiniteData],
  );

  // React Query already fetches on the first mount. Only kick off a manual
  // refetch when the cache has no result yet, so remounting this tab does not
  // issue a redundant GET.
  useEffect(() => {
    if (typeof refetch !== 'function' || !profiledata?.userid) return;
    if (isFetched) return;
    const now = Date.now();
    if (now - lastRefetchRef.current >= 20000) {
      lastRefetchRef.current = now;
      refetch({ cancelRefetch: false });
    }
  }, [refetch, profiledata?.userid, isFetched]);

  const handleManualRefresh = () => {
    if (typeof refetch === 'function' && !refreshDisabled) {
      lastRefetchRef.current = Date.now();
      refetch();
      setRefreshDisabled(true);
      setTimeout(() => setRefreshDisabled(false), 10000); // 10s cool-down track
    }
  };

  return (
    <div className="space-y-4">

      {/* Sub-Header Actions Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Events you have created
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshDisabled || isFetching}
            onClick={handleManualRefresh}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Refresh database query rows"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Unified Creation Button CTA Trigger */}
        <Button
          type="button"
          onClick={() => setCreateEventOpen(true)}
          disabled={!!error || isLoading}
          size="sm"
          className="self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Event
        </Button>
      </div>

      <Separator className="bg-border/60" />

      {/* Query Communication State Indicators */}
      {queryError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to map event registries: {queryError.message}</span>
        </div>
      )}

      {/* Main Core Display Content Switcher */}
      <div className="space-y-2">
        {isLoading && data.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Parsing organized records...</span>
          </div>
        ) : isObjEmpty(data) ? (
          /* Premium Empty Placeholder State Box */
          <Card className="w-full bg-gradient-to-br from-primary/5 via-background to-muted/20 border border-border/80 shadow-md backdrop-blur-sm animate-fadeIn">
            <CardContent className="pt-10 pb-10 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center text-primary">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5">
                No Events Created Yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
                Start deploying active meetups to synthesize connection points. Your managed events will populate this workspace area.
              </p>
              <Button
                onClick={() => setCreateEventOpen(true)}
                className="bg-primary hover:bg-primary/90 text-xs font-bold shadow-md"
                disabled={!!error}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Create Your First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Rendered Paginated Grid Items Column */
          <div className="animate-fadeIn">
            <EventList
              events={data}
              userhandle={userhandle}
              userlatitude={latitude}
              userlongitude={longitude}
              profiledata={profiledata}
              showOwnerActions
              onEditEvent={setEditingEvent}
              onDeleteEvent={setDeletingEvent}
            />

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full rounded-full border-border/60 bg-card/70 px-6 shadow-xs hover:bg-card md:w-auto"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    "Load More Created Events"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Unified Shared Create Event Modal Overlay Structure Context Container */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-y-auto bg-card border border-border">
          <div className="sr-only">
            <DialogTitle>Deploy New Event Manifest Node</DialogTitle>
            <DialogDescription>Specify operation rules, radius locations, and maximum visitor numbers.</DialogDescription>
          </div>
          {createEventOpen && (
            <Suspense fallback={<CreateEventFallback />}>
              <CreateEvent onClose={() => setCreateEventOpen(false)} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit event overlay */}
      <Dialog
        open={Boolean(editingEvent)}
        onOpenChange={(open) => {
          if (!open) setEditingEvent(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-border bg-card p-0">
          {editingEvent && (
            <EditEventDialog
              event={editingEvent}
              onClose={() => setEditingEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel/delete confirmation */}
      <AlertDialog
        open={Boolean(deletingEvent)}
        onOpenChange={(open) => {
          if (!open && !cancelEventMutation.isPending) setDeletingEvent(null);
        }}
      >
        <AlertDialogContent data-testid="cancel-event-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this event? This action cannot be
              undone and will automatically notify all registered attendees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelEventMutation.isPending}>
              Keep Event
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(clickEvent) => {
                clickEvent.preventDefault();

                const eventId = deletingEvent?.eventid || deletingEvent?.id;
                if (!eventId) return;

                cancelEventMutation.mutate(eventId, {
                  onSuccess: (result) => {
                    if (result?.success) {
                      toast.success(
                        "Event canceled. Attendees have been notified.",
                      );
                      setDeletingEvent(null);
                    } else {
                      toast.error(
                        result?.msg || "Could not cancel this event.",
                      );
                    }
                  },
                  onError: (cancelError) =>
                    toast.error(
                      cancelError?.message || "Could not cancel this event.",
                    ),
                });
              }}
            >
              {cancelEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {cancelEventMutation.isPending ? "Canceling..." : "Cancel Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}