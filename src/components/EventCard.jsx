import { useMemo } from "react";
import { Clock, Calendar, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { haversine } from "../utils/util";
import dayjs from "dayjs";

const getEventIcon = (locationName) => {
  const name = locationName?.toLowerCase() || "";
  if (name.includes("target") || name.includes("store") || name.includes("shop")) return "🛍️";
  if (name.includes("ross") || name.includes("clothing")) return "👕";
  if (name.includes("music") || name.includes("concert")) return "🎵";
  if (name.includes("photo") || name.includes("camera")) return "📷";
  return "❤️";
};

function attendeeHandles(event) {
  if (Array.isArray(event?.attendeeslist)) return event.attendeeslist;
  if (typeof event?.attendeeslist === "string" && event.attendeeslist.trim()) {
    return event.attendeeslist.replace(/\{|\}/gm, "").split(",");
  }
  if (Array.isArray(event?.attendeesdata)) {
    return event.attendeesdata.map((attendee) => attendee?.attendeehandle ?? "");
  }
  if (Array.isArray(event?.attendees)) {
    return event.attendees.map((attendee) => attendee?.handle ?? "");
  }
  return [];
}

function registeredAttendeeIds(event) {
  const ids = new Set();

  (Array.isArray(event?.registered_attendees)
    ? event.registered_attendees
    : []
  ).forEach((id) => ids.add(String(id)));

  (Array.isArray(event?.attendees) ? event.attendees : []).forEach(
    (attendee) => {
      const id = attendee?.id ?? attendee?.user_id ?? attendee?.userid;
      if (id) ids.add(String(id));
    },
  );

  return ids;
}

export function EventCard({
  setSelectedEvent,
  event,
  userlatitude,
  userlongitude,
  profiledata,
}) {
  const handles = useMemo(() => attendeeHandles(event), [event]);
  const registeredIds = useMemo(() => registeredAttendeeIds(event), [event]);

  const viewerIds = useMemo(
    () =>
      [profiledata?.userid, profiledata?.id]
        .filter(Boolean)
        .map((value) => String(value)),
    [profiledata?.userid, profiledata?.id],
  );

  const viewerHandle = String(
    profiledata?.userhandle ?? profiledata?.nickname ?? "",
  ).toLowerCase();

  const isRegistered = useMemo(() => {
    if (viewerIds.some((id) => registeredIds.has(id))) return true;
    if (!viewerHandle) return false;

    return handles.some(
      (handle) => String(handle ?? "").toLowerCase() === viewerHandle,
    );
  }, [viewerIds, registeredIds, handles, viewerHandle]);

  const attendingCount = useMemo(() => {
    const listed = handles.filter(
      (attendee) => attendee && String(attendee).trim(),
    ).length;

    if (listed > 0) return listed;

    const backendCount = Number(event?.attendees_count);
    return Number.isFinite(backendCount) ? backendCount : 0;
  }, [handles, event?.attendees_count]);

  const distance = useMemo(() => {
    const miles = haversine(
      userlatitude,
      userlongitude,
      event?.latitude,
      event?.longitude,
    );
    return Number.isFinite(miles) ? miles : 0;
  }, [event?.latitude, event?.longitude, userlatitude, userlongitude]);

  return (
    <Card
      key={event?.id}
      onClick={() => setSelectedEvent(event)}
      className="group relative p-3 shadow-xs border border-border/40 rounded-2xl hover:shadow-sm hover:bg-card/90 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer hover:border-primary/50 bg-card/60 overflow-hidden dark:shadow-md dark:hover:shadow-lg"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Registered indicator — derived from the live event cache payload. */}
      {isRegistered && (
        <div
          className="absolute top-2 right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 px-1.5 text-[10px] font-black text-white shadow-md ring-1 ring-white/50"
          title="Registered for this event"
          aria-label="Registered for this event"
        >
          R
        </div>
      )}

      <div className="relative p-4">
        {/* Header with icon and title */}
        <div className="flex items-start gap-2 mb-3">
          <div className="p-1.5 bg-linear-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20 shrink-0">
            {getEventIcon(event?.locationdata?.locationname)}
          </div>
          <div className="flex-1 min-w-0">
            {/* Event Title */}
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-1 truncate">
              {event?.title || event?.name || "Event Title"}
            </h3>
            {/* Location Name */}
            <p className="text-sm font-medium text-muted-foreground truncate">
              📍 {event?.locationdata?.locationname || event?.location}
            </p>
          </div>
        </div>

        {/* Event details - compact layout */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {event?.starttime?.substring(0, 5)} - {event?.endtime?.substring(0, 5)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {dayjs(event?.eventdate).format("MMM D, YYYY")}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
              {event?.locationdata?.address1}
            </span>
          </div>
        </div>

        {/* Footer with attendees and distance */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{attendingCount} attending</span>
          </div>
          <div className="px-2 py-1 bg-linear-to-r from-primary/20 to-primary/10 rounded-md border border-primary/20">
            <p className="text-xs font-bold text-primary">
              {distance.toFixed(1)} mi
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
