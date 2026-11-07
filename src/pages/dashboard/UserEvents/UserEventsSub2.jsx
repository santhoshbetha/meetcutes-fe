import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { haversine } from "@/utils/util";
import { useUserEvents2 } from "@/hooks/useEvents";
import secureLocalStorage from "react-secure-storage";
import { Separator } from '@/components/ui/separator';
import { EventList } from "@/components/EventList";
import { CalendarIcon, Search, Heart, RefreshCw, Loader2, AlertCircle } from "lucide-react";

export function UserEventsSub2({ profiledata, userhandle, latitude, longitude }) {
  const navigate = useNavigate();
  const lastRefetchRef = useRef(0);
  const [refreshDisabled, setRefreshDisabled] = useState(false);

  const {
    isLoading,
    isFetching,
    error,
    data: infiniteData,
    refetch,
    isFetched,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserEvents2();

  const data = useMemo(
    () => infiniteData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
    [infiniteData],
  );

  // React Query owns the initial fetch. Skip the mount refetch when a cached
  // result already exists so tab switches stay network-free.
  useEffect(() => {
    if (typeof refetch !== 'function' || !userhandle) return;
    if (isFetched) return;
    const now = Date.now();

    if (now - lastRefetchRef.current >= 20000) {
      lastRefetchRef.current = now;
      refetch({ cancelRefetch: false });
    }
  }, [refetch, userhandle, isFetched]);

  // Immutable distance calculations + storage persistence sync
  const processedEvents = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const computed = data.map((event) => ({
      ...event,
      distance: haversine(latitude, longitude, event.latitude, event.longitude)
    }));

    // Local persistence caching layer sync
    secureLocalStorage.setItem("data", computed);
    return computed;
  }, [data, latitude, longitude]);

  const handleManualRefresh = () => {
    if (typeof refetch === 'function' && !refreshDisabled) {
      lastRefetchRef.current = Date.now();
      refetch();
      setRefreshDisabled(true);
      setTimeout(() => setRefreshDisabled(false), 10000); // 10s cooldown
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Header Actions Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          Your Upcoming Events
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshDisabled || isFetching}
          onClick={handleManualRefresh}
          className="self-start sm:self-auto bg-card/50 h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </Button>
      </div>

      <Separator className="bg-border/60" />

      {/* Main Core Display Workspace */}
      <div className="space-y-2">
        {isLoading && processedEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Parsing registered events itinerary...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to map event registries: {error.message}</span>
          </div>
        ) : processedEvents.length === 0 ? (
          /* Premium Empty Placeholder State Box */
          <Card className="w-full bg-gradient-to-br from-primary/5 via-background to-muted/20 border border-border/80 shadow-md backdrop-blur-sm animate-fadeIn">
            <CardContent className="pt-10 pb-10 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center text-primary">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5">
                No Upcoming Events Yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
                Discover amazing gatherings and meetups in your area. Start exploring and register for modules that interest you!
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto sm:max-w-none">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs font-bold shadow-md" onClick={() => navigate('/dashboard?tab=search')}>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Find Events
                </Button>
                <Button size="sm" variant="outline" className="text-xs font-bold bg-background/50" onClick={() => navigate('/dashboard?tab=users')}>
                  <Heart className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Find People
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Rendered Grid Items List Matrix Row */
          <div className="animate-fadeIn">
            <EventList
              events={processedEvents}
              userhandle={userhandle}
              userlatitude={latitude}
              userlongitude={longitude}
              profiledata={profiledata}
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
                    "Load More Registered Events"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}