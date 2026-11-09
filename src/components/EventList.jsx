import { useRef, useState, useMemo } from "react";
import { EventCard } from "./EventCard";
import EventDetailsDialog from "./EventDetailsDialog";
import { Badge } from '@/components/ui/badge';
import { Filter, Calendar, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { haversine } from "../utils/util";

export function EventList({
  events,
  userlatitude,
  userlongitude,
  profiledata,
  showOwnerActions = false,
  onEditEvent,
  onDeleteEvent,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sortBy, setSortBy] = useState("Date");
  const resultsRef = useRef(null);

  // Memoized, runtime-safe sorted events mapping array
  const sortedEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];

    const eventsCopy = [...events];

    if (sortBy === "Date") {
      return eventsCopy.sort((a, b) => {
        const dateA = new Date(a.eventdate || a.date || 0);
        const dateB = new Date(b.eventdate || b.date || 0);
        return dateA - dateB;
      });
    }

    if (sortBy === "Distance") {
      return eventsCopy
        .map(event => {
          // If distance was pre-calculated by parent submodules, reuse it to optimize cycles
          if (event.distance !== undefined) return event;

          // Safe check: prevent passing undefined values into math calculations
          const hasCoords = event.latitude !== undefined && event.longitude !== undefined;
          return {
            ...event,
            distance: hasCoords
              ? haversine(userlatitude, userlongitude, event.latitude, event.longitude)
              : Infinity // Push missing distance elements to the very bottom
          };
        })
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return eventsCopy;
  }, [events, sortBy, userlatitude, userlongitude]);

  return (
    <div className="w-full max-w-7xl mx-auto px-1 sm:px-4 space-y-6">

      {/* Header section with reactive statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">Events</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Explore events around your grid radius
            </p>
          </div>
          {sortedEvents.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5 text-xs whitespace-nowrap">
              {sortedEvents.length} found
            </Badge>
          )}
        </div>

        {/* Sorting Dropdown Control Node - Displays only if multiple records exist */}
        {sortedEvents.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-card/40 px-2 py-1 rounded-xl border border-border/60">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
              <SelectTrigger className="w-36 h-8 border-none bg-transparent focus:ring-0 focus:ring-offset-0 p-1 text-xs font-semibold">
                <SelectValue placeholder="Sort Parameters" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border">
                <SelectGroup>
                  <SelectItem value="Date" className="text-xs">Sort by Date</SelectItem>
                  <SelectItem value="Distance" className="text-xs">Sort by Distance</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Reactive Interface Layout Box Grid */}
      <div ref={resultsRef} className="outline-none focus:outline-none">
        {sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
            {sortedEvents.map((event, index) => {
              // Bug Fix: Secure precise identification parameters across all submodules schemas
              const stableEventId = event?.eventid || event?.id || `idx-${index}`;

              return (
                <EventCard
                  key={stableEventId}
                  setSelectedEvent={setSelectedEvent}
                  event={event}
                  userlatitude={userlatitude}
                  userlongitude={userlongitude}
                  profiledata={profiledata}
                  showOwnerActions={showOwnerActions}
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              );
            })}
          </div>
        ) : (
          /* Premium Empty Placeholder State Box Layout */
          <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl bg-card/10 max-w-md mx-auto animate-fadeIn">
            <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">No events found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Try modifying your radius configurations or check back later for active community schedules.
            </p>
          </div>
        )}
      </div>

      {/* Overlay Details Window Context Handler */}
      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          profiledata={profiledata}
        />
      )}
    </div>
  );
}