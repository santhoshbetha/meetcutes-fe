import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, MapPin, X, Users, Heart, CheckCircle, AlertCircle, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { isAgeEligibleForEvent } from "@/lib/eventAgeRestriction";
import {
  useRegisterToAnEvent,
  useUnregisterToAnEvent,
  useEventFatigue,
} from "@/hooks/useEvents";
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

const MOBILE_EVENT_QUERY = "(max-width: 1023px)";
const EVENTS_SCROLL_KEY = "meetcutes:events-scroll-top";

export default function EventDetailsDialog({ event, onClose, profiledata, loading = false }) {
  const { userSession } = useAuth();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState(event || {});
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [showFatigueConfirm, setShowFatigueConfirm] = useState(false);
  const [attendanceOverride, setAttendanceOverride] = useState(null);

  const registerToAnEvent = useRegisterToAnEvent();
  const unregisterToAnEvent = useUnregisterToAnEvent();

  const eventId = eventDetails?.eventid || eventDetails?.id;

  const openFullEvent = () => {
    const targetId = eventId || event?.eventid || event?.id;

    if (!targetId) return;

    const isMobileViewport =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(MOBILE_EVENT_QUERY).matches;

    if (isMobileViewport) {
      try {
        const scroller = document.querySelector("main");
        const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
        window.sessionStorage.setItem(EVENTS_SCROLL_KEY, String(scrollTop));
      } catch {
        // Scroll restoration is best-effort; navigation must still proceed.
      }

      navigate(`/event/${targetId}`, { state: { from: "dialog" } });
      return;
    }

    window.open(`/event/${targetId}`, "_blank");
  };

  useEffect(() => {
    if (event) setEventDetails(event);
    setAttendanceOverride(null);
  }, [event]);

  const isRegistered = useMemo(() => {
    if (attendanceOverride !== null) return attendanceOverride;

    const attendeeslist = eventDetails?.attendeeslist;
    if (!attendeeslist) return false;

    const handles = Array.isArray(attendeeslist)
      ? attendeeslist
      : String(attendeeslist).replace(/\{|\}/gm, "").split(",");
    const viewerHandle = String(
      profiledata?.userhandle ?? profiledata?.nickname ?? "",
    ).toLowerCase();

    return handles.some(
      (handle) => String(handle ?? "").toLowerCase() === viewerHandle,
    );
  }, [
    attendanceOverride,
    eventDetails?.attendeeslist,
    profiledata?.userhandle,
    profiledata?.nickname,
  ]); 

  const ageMismatch = !isAgeEligibleForEvent(eventDetails, profiledata);
  const registrationBlocked = ageMismatch && !isRegistered;

  const fatigueQuery = useEventFatigue(eventId, {
    enabled: Boolean(userSession && eventId && !isRegistered && !registrationBlocked),
  });

  const maleCount = eventDetails?.male_count ?? eventDetails?.males ?? 0;
  const femaleCount = eventDetails?.female_count ?? eventDetails?.females ?? 0;

  const confirmRegistration = async () => {
    if (registrationBlocked) return;

    setShowFatigueConfirm(false);
    setIsRegistering(true);
    setRegistrationMessage("");

    const wasRegistered = isRegistered;

    try {
      const mutation = wasRegistered ? unregisterToAnEvent : registerToAnEvent;
      const result = await mutation.mutateAsync({
        eventId,
        userhandle: profiledata?.userhandle ?? profiledata?.nickname,
      });

      if (!result?.success) {
        if (result?.code === "already_attending") {
          setAttendanceOverride(true);
          setRegistrationMessage(
            "You're already registered for this event. The button is now set to leave it.",
          );
          return;
        }

        if (result?.code === "not_attending") {
          setAttendanceOverride(false);
          setRegistrationMessage(
            "You're already unregistered from this event.",
          );
          return;
        }

        throw new Error(result?.msg || "Registration failed. Please try again.");
      }

      setAttendanceOverride(!wasRegistered);

      if (result.data?.event) {
        setEventDetails((current) => ({
          ...current,
          ...result.data.event,
          attendeeslist:
            result.data.event.attendeeslist ?? current?.attendeeslist,
        }));
      }

      setRegistrationMessage(
        wasRegistered
          ? "You've been unregistered from this event."
          : "Successfully registered for this event!",
      );
    } catch (error) {
      const message =
        error?.message || "Registration failed. Please try again.";
      setRegistrationMessage(message);
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegistration = async () => {
    if (!userSession) {
      setRegistrationMessage("Please log in to register for events.");
      return;
    }

    if (registrationBlocked) return;

    if (isRegistered) {
      await confirmRegistration();
      return;
    }

    try {
      const result = await fatigueQuery.refetch();

      if (result.data) {
        setShowFatigueConfirm(true);
        return;
      }
    } catch {
      // A fatigue-check outage must not block registration.
    }

    await confirmRegistration();
  };

  const getEventIcon = (locationName) => {
    const name = locationName?.toLowerCase() || '';
    if (name.includes('target') || name.includes('store') || name.includes('shop')) return '🛍️';
    if (name.includes('ross') || name.includes('clothing')) return '👕';
    if (name.includes('music') || name.includes('concert')) return '🎵';
    if (name.includes('photo') || name.includes('camera')) return '📸';
    if (name.includes('coffee') || name.includes('cafe')) return '☕';
    if (name.includes('book') || name.includes('library')) return '📚';
    if (name.includes('park') || name.includes('walk')) return '🌳';
    if (name.includes('art') || name.includes('gallery')) return '🎨';
    if (name.includes('food') || name.includes('truck')) return '🍔';
    return '📅';
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogTitle></AlertDialogTitle>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Global Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <Spinner size="xlarge" className="mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Loading event details...</p>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            {/* Event Title */}
            <div className="flex items-start gap-3 flex-1">
              <div className="text-3xl">{getEventIcon(event?.locationdata?.locationname || event?.name)}</div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-primary mb-1">
                  {event?.title || event?.name || 'Event Title'}
                </h2>
                <p className="text-base font-medium text-muted-foreground mb-2">
                  📍 {event?.locationdata?.locationname || event?.location}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Event
                  </Badge>
                  {isRegistered && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                className="bg-background hover:bg-muted rounded-lg transition-colors group"
                onClick={openFullEvent}
                title="Open event page"
                aria-label="Open event page"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Button>
              <Button
                className="bg-background hover:bg-muted rounded-lg transition-colors group"
                onClick={onClose}
              >
                <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Button>
            </div>
          </div>

          <AlertDialogDescription className="sr-only">
            View detailed information about this event including date, time, location, and attendee information. You can register or unregister for the event from this dialog.
          </AlertDialogDescription>

          {/* Event Info */}
          <div className="space-y-1 mb-4">
            <h3 className="text-base font-bold text-primary mb-2">Details</h3>
            <div className="flex items-center gap-3 text-muted-foreground px-3 py-2 bg-background/50 rounded-lg border border-border/30">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">{event?.starttime?.substring(0, 5)} - {event?.endtime?.substring(0, 5)}</span>
                <span className="text-xs text-muted-foreground">Duration</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-blue-600 px-3 py-2 bg-background/50 rounded-lg border border-border/30">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">
                  {event?.eventdate ? new Date(event.eventdate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : event?.date}
                </span>
                <span className="text-xs text-muted-foreground">Date</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-dark px-3 py-2 bg-background/50 rounded-lg border border-border/30">
              <div className="p-1.5 bg-green-500/10 rounded-lg mt-0.5">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block leading-relaxed">
                  {event?.locationdata?.address1 || event?.location}
                </span>
                <span className="text-xs text-muted-foreground">Location</span>
              </div>
            </div>
          </div>

          {/* Attendees Section */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-primary mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              People
            </h3>
            <div className="grid grid-cols-2 gap-2 pl-6">
              <div className="p-3 bg-background/50 rounded-lg border border-border/30">
                <p className="text-xl font-bold text-blue-600">{maleCount}</p>
                <p className="text-xs text-muted-foreground">Males</p>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border border-border/30">
                <p className="text-xl font-bold text-pink-600">{femaleCount}</p>
                <p className="text-xs text-muted-foreground">Females</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Details Section */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-foreground mb-3">Event Details</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {eventDetails?.description ||
                eventDetails?.details ||
                "Join us for a wonderful meetup experience! This is a great opportunity to meet new people, share interests, and create lasting connections. We'll have plenty of activities planned to ensure everyone has a great time. Feel free to bring your enthusiasm and an open mind!"}
            </p>
          </div>

          {/* Registration Message */}
          {registrationMessage && (
            <div className={`mb-3 p-3 rounded-lg border ${
              registrationMessage.includes('Successfully') || registrationMessage.includes('unregistered')
                ? 'bg-green-500/10 border-green-500/20 text-green-700'
                : 'bg-red-500/10 border-red-500/20 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {registrationMessage.includes('Successfully') || registrationMessage.includes('unregistered') ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{registrationMessage}</span>
              </div>
            </div>
          )}

          {/* Register Button */}
          <Button
            onClick={handleRegistration}
            disabled={isRegistering || registrationBlocked}
            variant={registrationBlocked ? "secondary" : "default"}
            className={`w-full font-semibold py-3 rounded-md transition-all ${
              registrationBlocked
                ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none hover:bg-muted hover:shadow-none hover:scale-100 active:scale-100"
                : isRegistered
                  ? "bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-green-500 hover:bg-green-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {registrationBlocked ? (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Age Requirement Mismatch
              </div>
            ) : isRegistering ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                {isRegistered ? 'Unregistering...' : 'Registering...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Heart className={`w-4 h-4 ${isRegistered ? 'fill-current' : ''}`} />
                {isRegistered
                  ? 'UNREGISTER / LEAVE EVENT'
                  : 'REGISTER FOR THIS EVENT'}
              </div>
            )}
          </Button>

          {registrationBlocked && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              This event is restricted to organizers&apos; specified age bounds.
            </p>
          )}

          <AlertDialog
            open={showFatigueConfirm}
            onOpenChange={setShowFatigueConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Register for Event
                </AlertDialogTitle>
                <AlertDialogDescription>
                  More than half of this event attendees are from your previous
                  events. Press 'Register' to continue to register for this
                  event.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmRegistration}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Register
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
